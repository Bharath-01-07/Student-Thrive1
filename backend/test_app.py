import io
import json
import os
import sqlite3
import tempfile
import unittest
from pathlib import Path

from fastapi.testclient import TestClient
from openpyxl import Workbook

_test_database = tempfile.TemporaryDirectory(prefix="student-thrive-tests-")
os.environ["STUDENT_THRIVE_DB_PATH"] = str(Path(_test_database.name) / "student-thrive-test.db")
os.environ["STUDENT_THRIVE_ENV"] = "development"
os.environ["STUDENT_THRIVE_SEED_DEMO_DATA"] = "true"

from backend.app import app


class StudentThriveApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.client = TestClient(app)

    def login(self, email: str, password: str, role: str) -> str:
        response = self.client.post(
            "/api/auth/login",
            json={"email": email, "password": password, "role": role},
        )
        self.assertEqual(response.status_code, 200)
        return response.json()["token"]

    def test_health_and_readiness(self) -> None:
        self.assertEqual(self.client.get("/api/health").status_code, 200)
        self.assertEqual(self.client.get("/api/health/ready").status_code, 200)

    def test_security_headers_are_present(self) -> None:
        response = self.client.get("/api/health")
        self.assertEqual(response.headers["x-content-type-options"], "nosniff")
        self.assertEqual(response.headers["x-frame-options"], "DENY")

    def test_directory_requires_authentication(self) -> None:
        response = self.client.get("/api/students")
        self.assertEqual(response.status_code, 401)

    def test_staff_token_uses_current_database_role(self) -> None:
        token = self.login("priya.shah@institution.edu", "faculty123", "Faculty")
        connection = sqlite3.connect(os.environ["STUDENT_THRIVE_DB_PATH"])
        try:
            connection.execute(
                "UPDATE users SET role = 'Student' WHERE email = ?",
                ("priya.shah@institution.edu",),
            )
            connection.commit()
            response = self.client.get(
                "/api/reports/history",
                headers={"Authorization": f"Bearer {token}"},
            )
            self.assertEqual(response.status_code, 403)
        finally:
            connection.execute(
                "UPDATE users SET role = 'Faculty' WHERE email = ?",
                ("priya.shah@institution.edu",),
            )
            connection.commit()
            connection.close()

    def test_student_directory_is_scoped(self) -> None:
        token = self.login(
            "vamsikrishna@institution.edu", "241FA20019", "Student"
        )
        response = self.client.get(
            "/api/students", headers={"Authorization": f"Bearer {token}"}
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            [student["email"] for student in response.json()["students"]],
            ["vamsikrishna@institution.edu"],
        )

    def test_student_cannot_export(self) -> None:
        token = self.login(
            "vamsikrishna@institution.edu", "241FA20019", "Student"
        )
        response = self.client.post(
            "/api/reports/generate",
            json={"email": "vamsikrishna@institution.edu", "role": "Student"},
            headers={"Authorization": f"Bearer {token}"},
        )
        self.assertEqual(response.status_code, 403)

    def test_wrong_password_is_rejected(self) -> None:
        response = self.client.post(
            "/api/auth/login",
            json={
                "email": "vamsikrishna@institution.edu",
                "password": "incorrect-password",
                "role": "Student",
            },
        )
        self.assertEqual(response.status_code, 401)

    def test_staff_self_registration_is_rejected(self) -> None:
        response = self.client.post(
            "/api/auth/register",
            json={
                "role": "Advisor",
                "name": "Self Registered Advisor",
                "email": "self.registered@example.edu",
                "password": "secure-password",
                "department": "Student Support",
                "employee_id": "ADV-0000",
            },
        )
        self.assertEqual(response.status_code, 403)

    def test_student_cannot_write_verified_progress(self) -> None:
        token = self.login("vamsikrishna@institution.edu", "241FA20019", "Student")
        response = self.client.post(
            "/api/progress",
            json={
                "email": "maya.iyer@institution.edu",
                "attendance": 100,
                "gpa": 10,
                "skills": 100,
                "streak": 100,
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        self.assertEqual(response.status_code, 403)

    def test_staff_progress_updates_are_recorded_in_history(self) -> None:
        token = self.login("priya.shah@institution.edu", "faculty123", "Faculty")
        response = self.client.post(
            "/api/progress",
            json={
                "email": "maya.iyer@institution.edu",
                "attendance": 0,
                "gpa": 0,
                "skills": 0,
                "streak": 0,
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        self.assertEqual(response.status_code, 200)

        history = self.client.get(
            "/api/students/maya.iyer@institution.edu/progress/history",
            headers={"Authorization": f"Bearer {token}"},
        )
        self.assertEqual(history.status_code, 200)
        self.assertGreaterEqual(len(history.json()["history"]), 1)
        self.assertEqual(history.json()["history"][-1]["attendance"], 0)
        self.assertEqual(history.json()["history"][-1]["gpa"], 0)

    def test_student_progress_history_is_private(self) -> None:
        token = self.login("vamsikrishna@institution.edu", "241FA20019", "Student")
        response = self.client.get(
            "/api/students/maya.iyer@institution.edu/progress/history",
            headers={"Authorization": f"Bearer {token}"},
        )
        self.assertEqual(response.status_code, 403)

    def test_student_assistant_does_not_disclose_other_profiles(self) -> None:
        token = self.login("vamsikrishna@institution.edu", "241FA20019", "Student")
        response = self.client.post(
            "/api/assistant/chat",
            json={
                "message": "What is my attendance?",
                "student_email": "maya.iyer@institution.edu",
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        self.assertEqual(response.status_code, 403)

    def test_student_assistant_uses_recorded_attendance(self) -> None:
        token = self.login("vamsikrishna@institution.edu", "241FA20019", "Student")
        response = self.client.post(
            "/api/assistant/chat",
            json={"message": "What is my attendance?"},
            headers={"Authorization": f"Bearer {token}"},
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn("91%", response.json()["answer"])

    def test_student_assistant_offers_general_career_guidance(self) -> None:
        token = self.login("vamsikrishna@institution.edu", "241FA20019", "Student")
        response = self.client.post(
            "/api/assistant/chat",
            json={"message": "Can you help me prepare for an interview?"},
            headers={"Authorization": f"Bearer {token}"},
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn("career preparation", response.json()["answer"])
        self.assertIn("verified placement", response.json()["answer"])

    def test_staff_import_validates_and_activates_new_students(self) -> None:
        token = self.login("priya.shah@institution.edu", "faculty123", "Faculty")
        csv_content = (
            "name,email,registration_number,course,department,year,section,attendance,gpa,skills,streak\n"
            "Imported Student,imported.student@example.edu,241FA99999,Computer Science,Engineering,Year 1,Section A,90,8.2,70,3\n"
            "Duplicate Student,imported.student@example.edu,241FA99995,Computer Science,,,,90,8.2,70,3\n"
            "Invalid Student,not-an-email,241FA99998,Computer Science,,,,101,11,120,-1\n"
        )
        response = self.client.post(
            "/api/students/import",
            files={"file": ("students.csv", csv_content, "text/csv")},
            headers={"Authorization": f"Bearer {token}"},
        )
        self.assertEqual(response.status_code, 200)
        result = response.json()
        self.assertEqual(result["successful"], 1)
        self.assertEqual(result["created"], 1)
        self.assertEqual(result["failed"], 2)
        self.assertEqual(len(result["activations"]), 1)
        activation = result["activations"][0]
        activated = self.client.post(
            "/api/auth/activate",
            json={
                "email": activation["email"],
                "code": activation["code"],
                "password": "new-secure-password",
            },
        )
        self.assertEqual(activated.status_code, 200)
        reused = self.client.post(
            "/api/auth/activate",
            json={
                "email": activation["email"],
                "code": activation["code"],
                "password": "another-secure-password",
            },
        )
        self.assertEqual(reused.status_code, 400)
        logged_in = self.client.post(
            "/api/auth/login",
            json={
                "email": activation["email"],
                "password": "new-secure-password",
                "role": "Student",
            },
        )
        self.assertEqual(logged_in.status_code, 200)
        self.assertNotIn("password", logged_in.json()["user"])

    def test_staff_import_supports_json_and_excel(self) -> None:
        token = self.login("priya.shah@institution.edu", "faculty123", "Faculty")
        headers = {"Authorization": f"Bearer {token}"}
        record = {
            "name": "JSON Import Student",
            "email": "json.import@example.edu",
            "registration_number": "241FA99997",
            "course": "Computer Science",
        }
        json_response = self.client.post(
            "/api/students/import",
            files={"file": ("students.json", json.dumps([record]), "application/json")},
            headers=headers,
        )
        self.assertEqual(json_response.status_code, 200)
        self.assertEqual(json_response.json()["created"], 1)

        workbook = Workbook()
        sheet = workbook.active
        sheet.append(["name", "email", "registration_number", "course"])
        sheet.append(["Excel Import Student", "excel.import@example.edu", "241FA99996", "Engineering"])
        excel_content = io.BytesIO()
        workbook.save(excel_content)
        excel_response = self.client.post(
            "/api/students/import",
            files={"file": ("students.xlsx", excel_content.getvalue(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
            headers=headers,
        )
        self.assertEqual(excel_response.status_code, 200)
        self.assertEqual(excel_response.json()["created"], 1)

        student_token = self.login("vamsikrishna@institution.edu", "241FA20019", "Student")
        denied = self.client.post(
            "/api/students/import",
            files={"file": ("students.json", json.dumps([record]), "application/json")},
            headers={"Authorization": f"Bearer {student_token}"},
        )
        self.assertEqual(denied.status_code, 403)

    def test_staff_import_rejects_unsupported_and_oversized_files(self) -> None:
        token = self.login("priya.shah@institution.edu", "faculty123", "Faculty")
        headers = {"Authorization": f"Bearer {token}"}
        unsupported = self.client.post(
            "/api/students/import",
            files={"file": ("students.txt", "not a supported file", "text/plain")},
            headers=headers,
        )
        self.assertEqual(unsupported.status_code, 400)
        oversized = self.client.post(
            "/api/students/import",
            files={"file": ("students.csv", b"x" * (5 * 1024 * 1024 + 1), "text/csv")},
            headers=headers,
        )
        self.assertEqual(oversized.status_code, 413)

    def test_staff_can_generate_student_report(self) -> None:
        token = self.login("priya.shah@institution.edu", "faculty123", "Faculty")
        response = self.client.post(
            "/api/reports/generate",
            json={"email": "vamsikrishna@institution.edu", "role": "Faculty"},
            headers={"Authorization": f"Bearer {token}"},
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn("content", response.json())
        self.assertIn("Consistency: 5 weeks", response.json()["content"])

    def test_staff_can_read_report_history(self) -> None:
        token = self.login("priya.shah@institution.edu", "faculty123", "Faculty")
        response = self.client.get(
            "/api/reports/history?student_email=vamsikrishna%40institution.edu",
            headers={"Authorization": f"Bearer {token}"},
        )
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.json()["history"], list)


if __name__ == "__main__":
    unittest.main()
