from __future__ import annotations

import json
import os
from http.client import HTTPMessage
from http.server import BaseHTTPRequestHandler
from typing import Any, Protocol
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qs, quote, urlencode, urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener


MAX_REQUEST_BYTES = 1_048_576
MAX_RESPONSE_BYTES = 2_097_152
MAX_SUPPORT_REQUEST_BYTES = 2_048
TABLES = {
    "profiles",
    "mood_entries",
    "assessments",
    "assessment_results",
    "appointments",
    "resources",
}
RPCS = {
    "admin_set_role",
    "set_appointment_status",
    "consume_ai_quota",
}
TOPICS = [
    "Offer a gentle breathing pause with no breath holding.",
    "Suggest balancing study and rest.",
    "Suggest three small everyday self-care activities.",
    "Suggest how an adult can reach out to a trusted person or qualified counselor.",
]
SYSTEM_PROMPT = (
    "You are Lumi, a transparent AI general wellbeing companion for adults. "
    "Give warm, brief, practical general education, at most 120 words. Do not "
    "diagnose, provide medical advice, pretend to be human or a therapist, "
    "claim monitoring, or imply exclusive emotional dependence. Encourage "
    "human support when appropriate. Do not invent contacts, institutions, "
    "or helpline numbers. Avoid guarantees. If breathing is discussed, "
    "suggest a comfortable pace and stopping if uncomfortable."
)


class UpstreamResponse(Protocol):
    headers: HTTPMessage

    def read(self, amt: int = -1) -> bytes: ...


class RejectRedirectHandler(HTTPRedirectHandler):
    def redirect_request(
        self, req: Request, fp: Any, code: int, msg: str, headers: Any, new_url: str
    ) -> None:
        return None


UPSTREAM = build_opener(RejectRedirectHandler())


def configured_supabase_url() -> str:
    value = os.environ.get("SUPABASE_URL", "").strip().rstrip("/")
    parsed = urlsplit(value)
    if (
        parsed.scheme != "https"
        or not parsed.hostname
        or not parsed.hostname.endswith(".supabase.co")
        or parsed.port is not None
        or parsed.username is not None
        or parsed.password is not None
        or parsed.path
        or parsed.query
        or parsed.fragment
    ):
        raise ValueError("SUPABASE_URL must be an HTTPS Supabase project URL.")
    return value


def configured_secret_key() -> str:
    value = os.environ.get("SUPABASE_SECRET_KEY", "").strip()
    if not value or value.startswith("replace_with_"):
        return ""
    return value


def read_upstream(
    url: str,
    method: str,
    headers: dict[str, str],
    body: bytes | None = None,
    timeout: int = 10,
) -> tuple[int, HTTPMessage, bytes]:
    request = Request(url, data=body, headers=headers, method=method)
    try:
        with UPSTREAM.open(request, timeout=timeout) as response:
            return response.status, response.headers, response.read(MAX_RESPONSE_BYTES + 1)
    except HTTPError as error:
        return error.code, error.headers, error.read(MAX_RESPONSE_BYTES + 1)


def parse_json(data: bytes) -> Any:
    return json.loads(data.decode("utf-8"))


def valid_resource(path: str) -> bool:
    parts = path.strip("/").split("/")
    if len(parts) == 3 and parts[:2] == ["rest", "v1"]:
        return parts[2] in TABLES
    if len(parts) == 4 and parts[:3] == ["rest", "v1", "rpc"]:
        return parts[3] in RPCS
    return False


class handler(BaseHTTPRequestHandler):
    server_version = "Stillwell"
    sys_version = ""

    def log_message(self, format: str, *args: object) -> None:
        return

    def _send(
        self,
        status: int,
        body: bytes,
        content_type: str = "application/json; charset=utf-8",
        extra_headers: HTTPMessage | None = None,
    ) -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "strict-origin-when-cross-origin")
        self.send_header("X-Frame-Options", "DENY")
        if extra_headers:
            for name in ("Content-Range", "Preference-Applied"):
                value = extra_headers.get(name)
                if value:
                    self.send_header(name, value)
        self.end_headers()
        if body and self.command != "HEAD":
            self.wfile.write(body)

    def _json(self, status: int, data: dict[str, Any]) -> None:
        self._send(status, json.dumps(data).encode("utf-8"))

    def _origin_allowed(self) -> bool:
        origin = self.headers.get("Origin")
        if not origin:
            return True
        host = self.headers.get("Host", "")
        proto = self.headers.get("x-forwarded-proto", "https").split(",")[0].strip()
        host = host.split(",")[0].strip()
        return bool(host) and origin == f"{proto}://{host}"

    def _request_body(self, limit: int = MAX_REQUEST_BYTES) -> bytes | None:
        if self.headers.get("Transfer-Encoding"):
            raise ValueError("Transfer-encoded requests are not supported.")
        length = self.headers.get("Content-Length", "0")
        if not length.isdigit():
            raise ValueError("Invalid request length.")
        size = int(length)
        if size > limit:
            raise OverflowError("Request body is too large.")
        return self.rfile.read(size) if size else None

    def do_GET(self) -> None:
        self._dispatch()

    def do_POST(self) -> None:
        self._dispatch()

    def do_PATCH(self) -> None:
        self._dispatch()

    def do_DELETE(self) -> None:
        self._dispatch()

    def do_OPTIONS(self) -> None:
        self._json(405, {"error": "Method not allowed"})

    def _dispatch(self) -> None:
        if not self._origin_allowed():
            self._json(403, {"error": "Origin not allowed"})
            return

        query = parse_qs(urlsplit(self.path).query, keep_blank_values=True)
        kind = query.get("kind", [""])[0]
        if kind == "health" and self.command == "GET":
            self._health()
        elif kind == "supabase":
            self._proxy_supabase(query.get("path", [""])[0])
        elif kind == "support" and self.command == "POST":
            self._support()
        else:
            self._json(404, {"error": "Not found"})

    def _health(self) -> None:
        try:
            configured_supabase_url()
            ready = bool(configured_secret_key())
        except ValueError:
            ready = False
        self._json(
            200 if ready else 503,
            {"status": "ready" if ready else "setup_required"},
        )

    def _session(self) -> tuple[str, str, str] | None:
        authorization = self.headers.get("Authorization", "")
        if not authorization.startswith("Bearer ") or len(authorization) > 8192:
            self._json(401, {"error": "Sign in required"})
            return None
        try:
            project_url = configured_supabase_url()
        except ValueError:
            self._json(503, {"error": "Supabase server configuration is invalid"})
            return None
        secret_key = configured_secret_key()
        if not secret_key:
            self._json(503, {"error": "Supabase server configuration is missing"})
            return None

        try:
            status, _, body = read_upstream(
                project_url + "/auth/v1/user",
                "GET",
                {"apikey": secret_key, "Authorization": authorization},
            )
        except (URLError, TimeoutError, OSError):
            self._json(502, {"error": "Could not verify the Supabase session"})
            return None
        if status in {400, 401, 403}:
            self._json(401, {"error": "Session expired. Sign in again."})
            return None
        if status != 200:
            self._json(502, {"error": "Could not verify the Supabase session"})
            return None
        try:
            user = parse_json(body)
            user_id = user["id"]
        except (json.JSONDecodeError, UnicodeDecodeError, KeyError, TypeError):
            self._json(502, {"error": "Supabase returned an invalid user response"})
            return None
        if not isinstance(user_id, str) or not user_id:
            self._json(401, {"error": "Session expired. Sign in again."})
            return None
        try:
            profile_status, _, profile_body = read_upstream(
                project_url
                + "/rest/v1/profiles?"
                + urlencode({"id": "eq." + user_id, "select": "id"}),
                "GET",
                {"apikey": secret_key, "Authorization": authorization},
            )
        except (URLError, TimeoutError, OSError):
            self._json(502, {"error": "Could not verify the account profile"})
            return None
        if profile_status != 200:
            self._json(403, {"error": "Account unavailable"})
            return None
        try:
            if not parse_json(profile_body):
                self._json(403, {"error": "Account unavailable"})
                return None
        except (json.JSONDecodeError, UnicodeDecodeError):
            self._json(502, {"error": "Supabase returned an invalid profile response"})
            return None
        return project_url, authorization, user_id

    def _proxy_supabase(self, target: str) -> None:
        if self.command not in {"GET", "POST", "PATCH", "DELETE"}:
            self._json(405, {"error": "Method not allowed"})
            return
        if len(target) > 8192:
            self._json(414, {"error": "Query is too long"})
            return
        target_url = urlsplit(target)
        if (
            target_url.scheme
            or target_url.netloc
            or not valid_resource(target_url.path)
            or target_url.fragment
        ):
            self._json(404, {"error": "Database resource not allowed"})
            return
        try:
            body = self._request_body()
        except OverflowError:
            self._json(413, {"error": "Request body is too large"})
            return
        except ValueError as error:
            self._json(400, {"error": str(error)})
            return

        session = self._session()
        if not session:
            return
        project_url, authorization, _ = session
        headers = {
            "apikey": configured_secret_key(),
            "Authorization": authorization,
            "Content-Type": self.headers.get("Content-Type", "application/json"),
            "Accept": "application/json",
        }
        prefer = self.headers.get("Prefer")
        if prefer:
            headers["Prefer"] = prefer
        upstream_url = project_url + target_url.path
        if target_url.query:
            upstream_url += "?" + target_url.query
        try:
            status, response_headers, response_body = read_upstream(
                upstream_url, self.command, headers, body, timeout=20
            )
        except (URLError, TimeoutError, OSError):
            self._json(502, {"error": "Supabase database request failed"})
            return
        if len(response_body) > MAX_RESPONSE_BYTES:
            self._json(502, {"error": "Supabase response is too large"})
            return
        self._send(
            status,
            response_body,
            response_headers.get("Content-Type", "application/json; charset=utf-8"),
            response_headers,
        )

    def _support(self) -> None:
        try:
            raw = self._request_body(MAX_SUPPORT_REQUEST_BYTES)
        except OverflowError:
            self._json(413, {"error": "Request too large"})
            return
        except ValueError as error:
            self._json(400, {"error": str(error)})
            return
        try:
            body = parse_json(raw or b"")
        except (json.JSONDecodeError, UnicodeDecodeError):
            self._json(400, {"error": "Invalid JSON"})
            return
        if not isinstance(body, dict):
            self._json(400, {"error": "Invalid request"})
            return

        session = self._session()
        if not session:
            return
        project_url, authorization, user_id = session

        if body.get("action") == "delete-account":
            self._delete_account(project_url, authorization, user_id)
            return

        topic = body.get("topic")
        if (
            body.get("action") != "topic"
            or type(topic) is not int
            or not 0 <= topic < len(TOPICS)
            or body.get("consent") is not True
        ):
            self._json(
                400,
                {
                    "error": "Choose an approved general topic and accept the AI disclosure"
                },
            )
            return

        key = os.environ.get("GEMINI_API_KEY", "").strip()
        model = os.environ.get("GEMINI_MODEL", "").strip()
        if not key or not model:
            self._json(
                503,
                {
                    "error": "AI is not configured. You can still use resources or request counseling."
                },
            )
            return

        headers = {
            "apikey": configured_secret_key(),
            "Authorization": authorization,
            "Content-Type": "application/json",
        }
        try:
            quota_status, _, quota_body = read_upstream(
                project_url + "/rest/v1/rpc/consume_ai_quota",
                "POST",
                headers,
                b"{}",
            )
        except (URLError, TimeoutError, OSError):
            self._json(503, {"error": "Unable to check usage. Try later."})
            return
        if quota_status != 200:
            self._json(503, {"error": "Unable to check usage. Try later."})
            return
        try:
            allowed = parse_json(quota_body)
        except (json.JSONDecodeError, UnicodeDecodeError):
            self._json(503, {"error": "Unable to check usage. Try later."})
            return
        if allowed is not True:
            self._json(
                429,
                {
                    "error": "Daily support limit reached. Please use the resource library or return tomorrow."
                },
            )
            return

        gemini_url = (
            "https://generativelanguage.googleapis.com/v1beta/models/"
            + quote(model, safe="")
            + ":generateContent"
        )
        gemini_body = json.dumps(
            {
                "systemInstruction": {"parts": [{"text": SYSTEM_PROMPT}]},
                "contents": [{"role": "user", "parts": [{"text": TOPICS[topic]}]}],
                "generationConfig": {"maxOutputTokens": 500, "temperature": 0.5},
            }
        ).encode("utf-8")
        try:
            result_status, _, result_body = read_upstream(
                gemini_url,
                "POST",
                {"Content-Type": "application/json", "x-goog-api-key": key},
                gemini_body,
                timeout=20,
            )
        except (URLError, TimeoutError, OSError):
            self._json(
                503,
                {
                    "error": "AI is temporarily unavailable. "
                    "You can still request human support."
                },
            )
            return
        if result_status != 200:
            self._json(
                429 if result_status == 429 else 503,
                {
                    "error": (
                        "Gemini quota is currently unavailable. Try again later or use the resource library."
                        if result_status == 429
                        else "AI is temporarily unavailable. You can still request human support."
                    )
                },
            )
            return
        try:
            data = parse_json(result_body)
            parts = data["candidates"][0]["content"]["parts"]
            text = "\n".join(
                part["text"]
                for part in parts
                if isinstance(part, dict) and isinstance(part.get("text"), str)
            )
        except (
            json.JSONDecodeError,
            UnicodeDecodeError,
            KeyError,
            IndexError,
            TypeError,
        ):
            text = ""
        if not text:
            self._json(
                503,
                {"error": "No response was available. Try a different topic."},
            )
            return
        self._json(200, {"reply": text[:4000]})

    def _delete_account(
        self, project_url: str, authorization: str, user_id: str
    ) -> None:
        service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()
        if not service_key:
            self._json(503, {"error": "Account deletion is not configured"})
            return
        headers = {
            "apikey": configured_secret_key(),
            "Authorization": authorization,
        }
        try:
            logout_status, _, _ = read_upstream(
                project_url + "/auth/v1/logout?scope=global", "POST", headers
            )
        except (URLError, TimeoutError, OSError):
            self._json(503, {"error": "Could not revoke sessions. Try again."})
            return
        if not 200 <= logout_status < 300:
            self._json(503, {"error": "Could not revoke sessions. Try again."})
            return
        try:
            delete_status, _, _ = read_upstream(
                project_url + "/auth/v1/admin/users/" + quote(user_id, safe=""),
                "DELETE",
                {
                    "apikey": service_key,
                    "Authorization": "Bearer " + service_key,
                },
            )
        except (
            URLError,
            TimeoutError,
            OSError,
        ):
            self._json(503, {"error": "Account deletion failed. Sign in again and retry."})
            return
        if 200 <= delete_status < 300:
            self._json(200, {"deleted": True})
        else:
            self._json(503, {"error": "Deletion failed. Sign in again and retry."})
