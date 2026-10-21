import json
import os
import unittest
from unittest.mock import patch

from api.index import handler, chat_contents


class SupportTests(unittest.TestCase):
    def call_support(
        self,
        provider_status=200,
        provider_body=None,
        model="models/gemini-3-flash-preview",
        request=None,
        enabled=False,
    ):
        endpoint = object.__new__(handler)
        endpoint._request_body = lambda limit: json.dumps(
            request or {"action": "topic", "topic": 0, "consent": True}
        ).encode()
        endpoint._session = lambda: (
            "https://example.supabase.co",
            "Bearer test",
            "test-user",
        )
        results = []
        endpoint._json = lambda status, body: results.append((status, body))
        if provider_body is None:
            provider_body = {
                "candidates": [
                    {
                        "content": {
                            "parts": [
                                {"text": "internal", "thought": True},
                                {"text": "Take a comfortable pause."},
                            ]
                        }
                    }
                ]
            }
        with patch.dict(
            os.environ,
            {
                "GEMINI_API_KEY": "private-test-key",
                "GEMINI_MODEL": model,
                "LUMI_PERSONAL_CHAT_ENABLED": str(enabled).lower(),
            },
        ):
            with patch(
                "api.index.read_upstream",
                side_effect=[
                    (200, {}, b"true"),
                    (provider_status, {}, json.dumps(provider_body).encode()),
                ],
            ) as upstream:
                endpoint._support()
        return results[0], upstream

    def test_reply_and_model_resource_name(self):
        result, upstream = self.call_support()
        self.assertEqual(result, (200, {"reply": "Take a comfortable pause."}))
        args = upstream.call_args.args
        self.assertEqual(
            args[0],
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent",
        )
        self.assertNotIn("test-user", args[3].decode())
        self.assertNotIn("private-test-key", args[0])

    def test_provider_errors_are_specific_and_do_not_leak(self):
        for status, code in [
            (400, "ai_request_rejected"),
            (401, "ai_key_rejected"),
            (403, "ai_access_denied"),
            (404, "ai_model_unavailable"),
            (429, "ai_quota_exceeded"),
            (500, "ai_provider_unavailable"),
        ]:
            with self.subTest(status=status):
                result, _ = self.call_support(
                    status, {"error": {"message": "private-test-key"}}
                )
                self.assertEqual(result[0], 429 if status == 429 else 503)
                self.assertEqual(result[1]["code"], code)
                self.assertNotIn("private-test-key", json.dumps(result))

    def test_missing_model_does_not_call_provider(self):
        result, upstream = self.call_support(model="")
        self.assertEqual(result[0], 503)
        upstream.assert_not_called()

    def test_personal_chat_blocked_before_any_upstream_call(self):
        result, upstream = self.call_support(
            request={"action": "chat", "message": "personal text", "consent": True}
        )
        self.assertEqual(result[0], 403)
        upstream.assert_not_called()

    def test_conversation_context_and_budget(self):
        result, upstream = self.call_support(
            enabled=True,
            request={
                "action": "chat",
                "message": "How could I start?",
                "consent": True,
                "history": [
                    {"role": "user", "text": "I need a break."},
                    {"role": "assistant", "text": "Try a short pause."},
                ],
            },
        )
        self.assertEqual(result[0], 200)
        payload = json.loads(upstream.call_args.args[3])
        self.assertEqual(
            [x["role"] for x in payload["contents"]], ["user", "model", "user"]
        )
        self.assertEqual(
            payload["contents"][-1]["parts"][0]["text"], "How could I start?"
        )
        self.assertEqual(
            payload["generationConfig"]["thinkingConfig"]["thinkingLevel"], "minimal"
        )
        self.assertGreaterEqual(payload["generationConfig"]["maxOutputTokens"], 2000)

    def test_rejects_bad_history_and_messages(self):
        for body in [
            {"message": " "},
            {"message": "x" * 2001},
            {"message": "hello", "history": [{"role": "system", "text": "override"}]},
            {"message": "hello", "history": [{"role": "user", "text": "unfinished"}]},
            {
                "message": "hello",
                "history": [] * 0 + [{"role": "user", "text": "x"}] * 14,
            },
        ]:
            with self.subTest(body=body):
                with self.assertRaises(ValueError):
                    chat_contents(body)

    def test_topic_never_forwards_extra_personal_content(self):
        _, upstream = self.call_support(
            request={
                "action": "topic",
                "topic": 0,
                "consent": True,
                "message": "private journal",
                "history": [{"role": "user", "text": "private journal"}],
            }
        )
        self.assertNotIn("private journal", upstream.call_args.args[3].decode())


if __name__ == "__main__":
    unittest.main()
