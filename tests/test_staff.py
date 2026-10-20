import json
import os
import unittest
from unittest.mock import patch

from api.index import handler


class StaffLoginTests(unittest.TestCase):
    def login(self, body=None, role="counselor", auth_status=200):
        endpoint = object.__new__(handler)
        endpoint._request_body = lambda limit: json.dumps(
            body if body is not None else {"username": "staff-test", "password": "example-password"}
        ).encode()
        replies = []
        endpoint._json = lambda status, value: replies.append((status, value))
        session = {"access_token": "user-token", "refresh_token": "user-refresh",
                   "user": {"id": "staff-id"}, "expires_in": 3600,
                   "unexpected_secret": "must-not-return"}
        with patch.dict(os.environ, {
            "STAFF_LOGIN_USERNAME": "staff-test", "STAFF_LOGIN_EMAIL": "staff@example.invalid",
            "SUPABASE_URL": "https://example.supabase.co", "SUPABASE_SECRET_KEY": "server-secret",
        }):
            with patch("api.index.read_upstream", side_effect=[
                (auth_status, {}, json.dumps(session).encode()),
                (200, {}, json.dumps([{"role": role}]).encode()),
            ]) as upstream:
                endpoint._staff_login()
        return replies[0], upstream

    def test_valid_staff_uses_user_token_and_returns_only_session(self):
        (status, response), upstream = self.login()
        self.assertEqual(status, 200)
        self.assertEqual(response["access_token"], "user-token")
        self.assertNotIn("unexpected_secret", response)
        self.assertNotIn("server-secret", json.dumps(response))
        self.assertEqual(upstream.call_args.args[2]["Authorization"], "Bearer user-token")
        self.assertEqual(json.loads(upstream.call_args_list[0].args[3])["email"], "staff@example.invalid")

    def test_student_is_denied_even_with_valid_password(self):
        (status, response), _ = self.login(role="student")
        self.assertEqual(status, 403)
        self.assertNotIn("access_token", response)

    def test_wrong_username_cannot_call_provider(self):
        (status, _), upstream = self.login({"username": "wrong", "password": "example-password"})
        self.assertEqual(status, 401)
        upstream.assert_not_called()

    def test_invalid_password_rejected(self):
        (status, response), upstream = self.login(auth_status=400)
        self.assertEqual(status, 401)
        self.assertEqual(upstream.call_count, 1)
        self.assertNotIn("access_token", response)

    def test_rate_limit_preserved(self):
        (status, _), _ = self.login(auth_status=429)
        self.assertEqual(status, 429)

    def test_invalid_input_never_calls_provider(self):
        for body in [[], {"username": 123, "password": "x"}, {"username": "staff-test", "password": ""}]:
            with self.subTest(body=body):
                (status, _), upstream = self.login(body)
                self.assertEqual(status, 400)
                upstream.assert_not_called()


if __name__ == "__main__":
    unittest.main()
