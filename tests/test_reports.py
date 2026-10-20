import json
import unittest
from unittest.mock import patch

from api.index import handler


class ReportTests(unittest.TestCase):
    def report(self, role):
        endpoint = object.__new__(handler)
        endpoint._session = lambda: ("https://example.supabase.co", "Bearer user-token", "test-user")
        results = []
        calls = []
        endpoint._json = lambda status, body: results.append((status, body))
        def upstream(url, method, headers):
            calls.append((url, method, headers))
            if method == "GET":
                return 200, {}, json.dumps([{"role": role}]).encode()
            return 200, {"Content-Range": "*/5"}, b""
        with patch("api.index.read_upstream", side_effect=upstream):
            endpoint._reports()
        return results[0], calls

    def test_students_cannot_read_reports(self):
        (status, _), calls = self.report("student")
        self.assertEqual(status, 403)
        self.assertEqual(len(calls), 1)

    def test_counselors_only_get_service_counts(self):
        (status, body), calls = self.report("counselor")
        self.assertEqual(status, 200)
        self.assertNotIn("profiles", body["counts"])
        self.assertEqual(body["counts"]["pending"], 5)
        self.assertTrue(all("mood_entries" not in url and "assessment_results" not in url for url, _, _ in calls))
        self.assertTrue(all(h["Authorization"] == "Bearer user-token" for _, _, h in calls))

    def test_admin_counts_exclude_private_records(self):
        (status, body), _ = self.report("admin")
        self.assertEqual(status, 200)
        self.assertEqual(body["counts"]["profiles"], 5)
        self.assertNotIn("test-user", json.dumps(body))


if __name__ == "__main__":
    unittest.main()
