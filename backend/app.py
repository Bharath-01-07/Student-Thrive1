from __future__ import annotations

import os
import re
import hashlib
import hmac
import csv
import io
import json
import secrets
import sqlite3
import unicodedata
from zipfile import BadZipFile
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Iterator, Literal, Optional
from xml.etree.ElementTree import ParseError

import jwt
from fastapi import FastAPI, HTTPException, Header, Query, Request, UploadFile, File, status
from fastapi.middleware.cors import CORSMiddleware
from openpyxl import load_workbook
from openpyxl.utils.exceptions import InvalidFileException
from pydantic import BaseModel, EmailStr, Field, ValidationError

DB_PATH = Path(os.getenv("STUDENT_THRIVE_DB_PATH", Path(__file__).resolve().parent / "student_thrive.db"))
APP_ENV = os.getenv("STUDENT_THRIVE_ENV", "development").lower()
JWT_SECRET = os.getenv("STUDENT_THRIVE_JWT_SECRET", "student-thrive-dev-secret-change-me")
if APP_ENV in {"production", "staging"} and (
    JWT_SECRET == "student-thrive-dev-secret-change-me" or len(JWT_SECRET) < 32
):
    raise RuntimeError("STUDENT_THRIVE_JWT_SECRET must be a random value of at least 32 characters outside development.")
SEED_DEMO_DATA = os.getenv("STUDENT_THRIVE_SEED_DEMO_DATA", "false").strip().lower() == "true"
if SEED_DEMO_DATA and APP_ENV != "development":
    raise RuntimeError("Demo data can only be enabled when STUDENT_THRIVE_ENV=development.")
JWT_ALGORITHM = "HS256"
JWT_ACCESS_TOKEN_EXPIRE_MINUTES = 12 * 60
PASSWORD_HASH_ITERATIONS = 600_000
LOGIN_ATTEMPT_WINDOW_SECONDS = 60
LOGIN_ATTEMPT_LIMIT = 5
DEFAULT_CORS_ORIGINS = "http://localhost:5173,http://localhost:5174"
CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv("STUDENT_THRIVE_CORS_ORIGINS", DEFAULT_CORS_ORIGINS).split(",")
    if origin.strip()
]
login_attempts: dict[str, list[datetime]] = {}
MAX_IMPORT_SIZE_BYTES = 5 * 1024 * 1024
MAX_IMPORT_RECORDS = 2000


@contextmanager
def get_connection() -> Iterator[sqlite3.Connection]:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
    except Exception:
        conn.rollback()
        raise
    else:
        conn.commit()
    finally:
        conn.close()


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        PASSWORD_HASH_ITERATIONS,
    )
    return f"pbkdf2_sha256${PASSWORD_HASH_ITERATIONS}${salt.hex()}${digest.hex()}"


def verify_password(password: str, stored_password: str) -> tuple[bool, bool]:
    if not stored_password.startswith("pbkdf2_sha256$"):
        return hmac.compare_digest(password, stored_password), True
    try:
        _, iterations, salt_hex, digest_hex = stored_password.split("$", 3)
        digest = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            bytes.fromhex(salt_hex),
            int(iterations),
        )
    except (ValueError, TypeError):
        return False, False
    return hmac.compare_digest(digest.hex(), digest_hex), False


def check_login_rate_limit(key: str) -> None:
    now = datetime.now(timezone.utc)
    attempts = [
        attempt
        for attempt in login_attempts.get(key, [])
        if (now - attempt).total_seconds() < LOGIN_ATTEMPT_WINDOW_SECONDS
    ]
    login_attempts[key] = attempts
    if len(attempts) >= LOGIN_ATTEMPT_LIMIT:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many login attempts. Try again in a minute.",
            headers={"Retry-After": str(LOGIN_ATTEMPT_WINDOW_SECONDS)},
        )
    attempts.append(now)


def init_db() -> None:
    with get_connection() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                password TEXT NOT NULL,
                role TEXT NOT NULL,
                reg TEXT,
                course TEXT,
                year TEXT,
                section TEXT,
                subjects TEXT,
                interests TEXT,
                details TEXT,
                department TEXT,
                employee_id TEXT,
                is_demo INTEGER NOT NULL DEFAULT 0
            )
            """
        )
        user_columns = {row["name"] for row in conn.execute("PRAGMA table_info(users)")}
        if "is_demo" not in user_columns:
            conn.execute("ALTER TABLE users ADD COLUMN is_demo INTEGER NOT NULL DEFAULT 0")
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS progress (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT NOT NULL UNIQUE,
                attendance REAL,
                gpa REAL,
                skills REAL,
                streak INTEGER,
                subject TEXT,
                achievement TEXT,
                wellbeing TEXT,
                notes TEXT
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS report_audit (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                generated_by TEXT NOT NULL,
                student_email TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS account_activations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT NOT NULL,
                token_hash TEXT NOT NULL UNIQUE,
                expires_at TEXT NOT NULL,
                used_at TEXT,
                created_by TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS progress_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT NOT NULL,
                recorded_at TEXT NOT NULL,
                recorded_by TEXT NOT NULL,
                attendance REAL,
                gpa REAL,
                skills REAL,
                streak INTEGER,
                subject TEXT,
                achievement TEXT,
                wellbeing TEXT,
                notes TEXT,
                FOREIGN KEY(email) REFERENCES users(email) ON DELETE CASCADE
            )
            """
        )
        conn.execute("CREATE INDEX IF NOT EXISTS idx_users_reg ON users(reg)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_users_email_nocase ON users(email COLLATE NOCASE)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_users_course ON users(course)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_users_department ON users(department)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_users_year ON users(year)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_users_section ON users(section)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_activations_email ON account_activations(email)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_progress_history_email ON progress_history(email, id)")

        demo_accounts = [
            ("vamsikrishna@institution.edu", "241FA20019"),
            ("maya.iyer@institution.edu", "STU-2024-0192"),
            ("priya.shah@institution.edu", None),
            ("alex.kumar@institution.edu", None),
        ]
        for email, registration in demo_accounts:
            if registration:
                conn.execute(
                    "UPDATE users SET is_demo = 1 WHERE email = ? AND reg = ?",
                    (email, registration),
                )
            else:
                conn.execute(
                    "UPDATE users SET is_demo = 1 WHERE email = ?",
                    (email,),
                )

        student_count = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
        if student_count == 0 and SEED_DEMO_DATA:
            conn.executemany(
                """
                INSERT INTO users (
                    name, email, password, role, reg, course, year, section,
                    subjects, interests, details, department, employee_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                [
                    (
                        "vamsi krishna",
                        "vamsikrishna@institution.edu",
                        "241FA20019",
                        "Student",
                        "241FA20019",
                        "CSE",
                        "Year 3",
                        "Section A",
                        "Data Structures, Problem Solving",
                        "Collaboration, Research",
                        "Interested in practical learning and career readiness.",
                        None,
                        None,
                    ),
                    (
                        "Maya Iyer",
                        "maya.iyer@institution.edu",
                        "secret123",
                        "Student",
                        "STU-2024-0192",
                        "Information Design",
                        "Year 2",
                        "Section B",
                        "Interaction Design, Design Research",
                        "Communication, Visual design",
                        "Exploring how research and storytelling can shape better products.",
                        None,
                        None,
                    ),
                    (
                        "Dr. Priya Shah",
                        "priya.shah@institution.edu",
                        "faculty123",
                        "Faculty",
                        None,
                        None,
                        None,
                        None,
                        None,
                        None,
                        None,
                        "Computer Science",
                        "EMP-1042",
                    ),
                    (
                        "Alex Kumar",
                        "alex.kumar@institution.edu",
                        "advisor123",
                        "Advisor",
                        None,
                        None,
                        None,
                        None,
                        None,
                        None,
                        None,
                        "Student Support",
                        "EMP-3001",
                    ),
                ],
            )
            conn.execute(
                "UPDATE users SET is_demo = 1 WHERE email IN (?, ?, ?, ?)",
                tuple(email for email, _ in demo_accounts),
            )

        progress_count = conn.execute("SELECT COUNT(*) FROM progress").fetchone()[0]
        if progress_count == 0:
            conn.executemany(
                """
                INSERT INTO progress (
                    email, attendance, gpa, skills, streak, subject, achievement,
                    wellbeing, notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                [
                    (
                        "vamsikrishna@institution.edu",
                        91,
                        8.7,
                        76,
                        5,
                        "Problem Solving",
                        "Poster presentation",
                        "Doing well",
                        "Solved 2 problem-solving questions this week.",
                    ),
                    (
                        "maya.iyer@institution.edu",
                        87,
                        8.1,
                        71,
                        7,
                        "Interaction Design",
                        "Research sprint",
                        "Steady",
                        "Completed a strong week of visual research and collaboration.",
                    ),
                ],
            )

        legacy_passwords = conn.execute(
            "SELECT email, password FROM users WHERE password NOT LIKE 'pbkdf2_sha256$%'"
        ).fetchall()
        for user in legacy_passwords:
            conn.execute(
                "UPDATE users SET password = ? WHERE email = ?",
                (hash_password(user["password"]), user["email"]),
            )

        conn.commit()


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=1024)
    role: Literal["Student", "Faculty", "Advisor"]


class RegisterRequest(BaseModel):
    role: Literal["Student", "Faculty", "Advisor"]
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=1024)
    reg: Optional[str] = Field(default=None, max_length=40)
    course: Optional[str] = Field(default=None, max_length=120)
    year: Optional[str] = Field(default=None, max_length=40)
    section: Optional[str] = Field(default=None, max_length=40)
    subjects: Optional[str] = Field(default=None, max_length=2000)
    interests: Optional[str] = Field(default=None, max_length=2000)
    details: Optional[str] = Field(default=None, max_length=4000)
    department: Optional[str] = Field(default=None, max_length=120)
    employee_id: Optional[str] = Field(default=None, max_length=40)


class ProgressRequest(BaseModel):
    email: EmailStr
    attendance: float = Field(ge=0, le=100)
    gpa: float = Field(ge=0, le=10)
    skills: float = Field(ge=0, le=100)
    streak: int = Field(ge=0)
    subject: Optional[str] = Field(default=None, max_length=160)
    achievement: Optional[str] = Field(default=None, max_length=500)
    wellbeing: Optional[str] = Field(default=None, max_length=80)
    notes: Optional[str] = Field(default=None, max_length=4000)


class ReportRequest(BaseModel):
    email: EmailStr
    role: Literal["Student", "Faculty", "Advisor"]


class ActivationRequest(BaseModel):
    email: EmailStr
    code: str = Field(min_length=32, max_length=128)
    password: str = Field(min_length=8, max_length=1024)


class StudentImportRecord(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    reg: str = Field(min_length=1, max_length=40)
    course: str = Field(min_length=1, max_length=120)
    department: Optional[str] = Field(default=None, max_length=120)
    year: Optional[str] = Field(default=None, max_length=40)
    section: Optional[str] = Field(default=None, max_length=40)
    subjects: Optional[str] = Field(default=None, max_length=2000)
    subject: Optional[str] = Field(default=None, max_length=160)
    interests: Optional[str] = Field(default=None, max_length=2000)
    attendance: Optional[float] = Field(default=None, ge=0, le=100)
    gpa: Optional[float] = Field(default=None, ge=0, le=10)
    skills: Optional[float] = Field(default=None, ge=0, le=100)
    streak: Optional[int] = Field(default=None, ge=0)
    achievement: Optional[str] = Field(default=None, max_length=500)
    wellbeing: Optional[str] = Field(default=None, max_length=80)
    notes: Optional[str] = Field(default=None, max_length=4000)


class AssistantRequest(BaseModel):
    message: str = Field(min_length=1, max_length=1000)
    student_email: Optional[EmailStr] = None


app = FastAPI(title="Student Thrive API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    if request.url.scheme == "https":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response


def clean_user_row(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "name": row["name"],
        "email": row["email"],
        "role": row["role"],
        "reg": row["reg"],
        "course": row["course"],
        "year": row["year"],
        "section": row["section"],
        "subjects": (row["subjects"] or "").split(",") if row["subjects"] else [],
        "interests": (row["interests"] or "").split(",") if row["interests"] else [],
        "details": row["details"],
        "department": row["department"],
        "employee_id": row["employee_id"],
        "is_demo": bool(row["is_demo"]),
    }


def load_progress(email: str) -> dict[str, Any]:
    with get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM progress WHERE email = ?",
            (email.lower(),),
        ).fetchone()
        if row is None:
            return {}
        return {
            "email": row["email"],
            "attendance": row["attendance"],
            "gpa": row["gpa"],
            "skills": row["skills"],
            "streak": row["streak"],
            "subject": row["subject"],
            "achievement": row["achievement"],
            "wellbeing": row["wellbeing"],
            "notes": row["notes"],
        }


def create_access_token(email: str, role: str) -> str:
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": email.lower(), "role": role, "exp": expires_at}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def get_current_user(authorization: Optional[str]) -> dict[str, str]:
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
        )

    auth_value = authorization.strip()
    match = re.match(r"^Bearer\s+(.+)$", auth_value, flags=re.IGNORECASE)
    if not match:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
        )

    token = match.group(1).strip()
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.PyJWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token.",
        ) from exc

    email = payload.get("sub")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload missing user identity.",
        )
    with get_connection() as conn:
        user = conn.execute(
            "SELECT role, is_demo FROM users WHERE email = ?",
            (str(email).lower(),),
        ).fetchone()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account is no longer available.",
        )
    if user["is_demo"] and not SEED_DEMO_DATA:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Demo accounts are disabled.",
        )
    return {"email": str(email).lower(), "role": str(user["role"])}


def normalized_import_key(value: Any) -> str:
    key = unicodedata.normalize("NFKC", str(value or "")).strip()
    key = re.sub(r"([a-z0-9])([A-Z])", r"\1_\2", key)
    key = re.sub(r"[^a-zA-Z0-9]+", "_", key).strip("_").lower()
    aliases = {
        "student_name": "name",
        "university_email": "email",
        "email_address": "email",
        "registration_number": "reg",
        "registration_no": "reg",
        "reg_number": "reg",
        "current_course": "course",
        "academic_average": "gpa",
        "cgpa": "gpa",
        "skill_progress": "skills",
        "learning_streak": "streak",
        "current_subjects": "subjects",
        "skills_to_develop": "interests",
    }
    return aliases.get(key, key)


def parse_student_import(filename: str, content: bytes) -> list[tuple[int, dict[str, Any]]]:
    extension = Path(filename).suffix.lower()
    try:
        if extension == ".csv":
            reader = csv.DictReader(io.StringIO(content.decode("utf-8-sig"), newline=""))
            if not reader.fieldnames:
                raise ValueError("CSV file must include a header row.")
            raw_rows = [(row_number, row) for row_number, row in enumerate(reader, start=2)]
        elif extension == ".json":
            payload = json.loads(content.decode("utf-8-sig"))
            records = payload.get("students") if isinstance(payload, dict) else payload
            if not isinstance(records, list):
                raise ValueError("JSON must contain a list of student records.")
            raw_rows = [(row_number, row) for row_number, row in enumerate(records, start=1)]
        elif extension in {".xlsx", ".xlsm"}:
            workbook = load_workbook(io.BytesIO(content), read_only=True, data_only=True)
            worksheet = workbook.active
            rows = worksheet.iter_rows(values_only=True)
            headers = next(rows, None)
            if not headers:
                workbook.close()
                raise ValueError("Spreadsheet must include a header row.")
            raw_rows = [
                (row_number, dict(zip(headers, row)))
                for row_number, row in enumerate(rows, start=2)
                if any(value is not None and str(value).strip() for value in row)
            ]
            workbook.close()
        else:
            raise ValueError("Upload a CSV, JSON, or Excel (.xlsx/.xlsm) file.")
    except (
        UnicodeDecodeError,
        json.JSONDecodeError,
        csv.Error,
        ValueError,
        BadZipFile,
        InvalidFileException,
        ParseError,
        OSError,
    ) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    if len(raw_rows) > MAX_IMPORT_RECORDS:
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail=f"Import is limited to {MAX_IMPORT_RECORDS} records per file.",
        )

    normalized_rows: list[tuple[int, dict[str, Any]]] = []
    for row_number, row in raw_rows:
        if not isinstance(row, dict):
            normalized_rows.append((row_number, {}))
            continue
        normalized: dict[str, Any] = {}
        for key, value in row.items():
            if key is None:
                continue
            normalized_key = normalized_import_key(key)
            if isinstance(value, (list, tuple)):
                value = ", ".join(str(item).strip() for item in value if item is not None)
            if isinstance(value, str):
                value = value.strip() or None
            normalized[normalized_key] = value
        normalized_rows.append((row_number, normalized))
    return normalized_rows


def import_validation_errors(error: ValidationError) -> list[str]:
    return [
        f"{'.'.join(str(part) for part in item['loc'])}: {item['msg']}"
        for item in error.errors(include_input=False)
    ]


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "student-thrive-api"}


@app.get("/api/health/ready")
def readiness() -> dict[str, str]:
    try:
        with get_connection() as conn:
            conn.execute("SELECT 1").fetchone()
    except sqlite3.Error as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database is not ready.",
        ) from exc
    return {"status": "ready", "service": "student-thrive-api"}


@app.post("/api/auth/login")
def login(payload: LoginRequest, request: Request) -> dict[str, Any]:
    email = payload.email.lower()
    login_key = f"{request.client.host if request.client else 'unknown'}:{email}"
    check_login_rate_limit(login_key)
    with get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM users WHERE email = ? AND role = ?",
            (email, payload.role),
        ).fetchone()

    password_valid = False
    legacy_password = False
    if row is not None:
        password_valid, legacy_password = verify_password(payload.password, row["password"])

    if row is None or not password_valid or (row["is_demo"] and not SEED_DEMO_DATA):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No matching registered credentials found for that role.",
        )

    login_attempts.pop(login_key, None)
    if legacy_password:
        with get_connection() as conn:
            conn.execute(
                "UPDATE users SET password = ? WHERE email = ?",
                (hash_password(payload.password), email),
            )
            conn.commit()

    user = clean_user_row(row)
    user["progress"] = load_progress(email)
    token = create_access_token(email, payload.role)
    return {"user": user, "token": token}


@app.post("/api/auth/register")
def register(payload: RegisterRequest) -> dict[str, Any]:
    if payload.role != "Student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Faculty and advisor accounts must be provisioned by an administrator.",
        )
    email = payload.email.lower()
    with get_connection() as conn:
        if conn.execute("SELECT 1 FROM users WHERE email = ?", (email,)).fetchone():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="That email is already linked to a profile.",
            )

        if payload.role == "Student":
            if not payload.reg or not re.match(r"^(?:241FA\d{5,}|251LA\d{5,}|STU-\d{4}-\d{4}|2\d{7,})$", payload.reg.strip(), re.IGNORECASE):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Use a valid student registration number.",
                )
            if not payload.course:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Course is required for student profiles.",
                )
        cursor = conn.execute(
            """
            INSERT INTO users (
                name, email, password, role, reg, course, year, section,
                subjects, interests, details, department, employee_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                payload.name.strip(),
                email,
                hash_password(payload.password),
                payload.role,
                (payload.reg or "").strip() if payload.reg else None,
                (payload.course or "").strip() if payload.course else None,
                (payload.year or "").strip() if payload.year else None,
                (payload.section or "").strip() if payload.section else None,
                (payload.subjects or "").strip() if payload.subjects else None,
                (payload.interests or "").strip() if payload.interests else None,
                (payload.details or "").strip() if payload.details else None,
                (payload.department or "").strip() if payload.department else None,
                (payload.employee_id or "").strip() if payload.employee_id else None,
            ),
        )
        user_row = conn.execute(
            "SELECT * FROM users WHERE id = ?",
            (cursor.lastrowid,),
        ).fetchone()
        conn.commit()

    token = create_access_token(email, payload.role)
    return {"message": "Profile created successfully.", "user": clean_user_row(user_row), "token": token}


@app.post("/api/auth/activate")
def activate_imported_account(payload: ActivationRequest) -> dict[str, str]:
    email = payload.email.lower()
    token_hash = hashlib.sha256(payload.code.encode("utf-8")).hexdigest()
    now = datetime.now(timezone.utc).isoformat()
    with get_connection() as conn:
        activation = conn.execute(
            """
            SELECT id FROM account_activations
            WHERE email = ? AND token_hash = ? AND used_at IS NULL AND expires_at > ?
            """,
            (email, token_hash, now),
        ).fetchone()
        if activation is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="That activation code is invalid or expired.",
            )
        user = conn.execute(
            "SELECT role FROM users WHERE email = ?",
            (email,),
        ).fetchone()
        if user is None or user["role"] != "Student":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This activation code cannot be used for that account.",
            )
        conn.execute(
            "UPDATE users SET password = ? WHERE email = ?",
            (hash_password(payload.password), email),
        )
        conn.execute(
            "UPDATE account_activations SET used_at = ? WHERE email = ? AND used_at IS NULL",
            (now, email),
        )
        conn.commit()
    return {"message": "Account activated. Sign in with your new password."}


@app.get("/api/me")
def me(authorization: Optional[str] = Header(default=None)) -> dict[str, Any]:
    current = get_current_user(authorization)
    with get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM users WHERE email = ?",
            (current["email"],),
        ).fetchone()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    user = clean_user_row(row)
    user["progress"] = load_progress(current["email"])
    return {"user": user}


@app.get("/api/students")
def list_students(authorization: Optional[str] = Header(default=None)) -> dict[str, list[dict[str, Any]]]:
    current = get_current_user(authorization)
    with get_connection() as conn:
        if current["role"] == "Student":
            rows = conn.execute(
                "SELECT * FROM users WHERE email = ? AND role = 'Student'",
                (current["email"],),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM users WHERE role = 'Student' AND (? = 1 OR is_demo = 0) ORDER BY name",
                (int(SEED_DEMO_DATA),),
            ).fetchall()
    students = [clean_user_row(row) for row in rows if row["role"] == "Student"]
    if current["role"] == "Student" and not students:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student account not found.")
    for student in students:
        student["progress"] = load_progress(student["email"])
    return {"students": students}


@app.get("/api/students/{student_email}/progress/history")
def progress_history(
    student_email: EmailStr,
    authorization: Optional[str] = Header(default=None),
) -> dict[str, list[dict[str, Any]]]:
    current = get_current_user(authorization)
    email = str(student_email).lower()
    if current["role"] == "Student" and email != current["email"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Students can only view their own progress history.",
        )
    with get_connection() as conn:
        student = conn.execute(
            "SELECT is_demo FROM users WHERE email = ? AND role = 'Student'",
            (email,),
        ).fetchone()
        if student is None or (student["is_demo"] and not SEED_DEMO_DATA):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student profile not found.")
        rows = conn.execute(
            """
            SELECT recorded_at, attendance, gpa, skills, streak, subject,
                   achievement, wellbeing, notes
            FROM progress_history
            WHERE email = ?
            ORDER BY id
            """,
            (email,),
        ).fetchall()
    return {"history": [dict(row) for row in rows]}


@app.post("/api/assistant/chat")
def student_assistant(
    payload: AssistantRequest,
    authorization: Optional[str] = Header(default=None),
) -> dict[str, str]:
    current = get_current_user(authorization)
    if current["role"] == "Student" and payload.student_email and payload.student_email.lower() != current["email"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Students can only ask about their own profile.",
        )
    email = payload.student_email.lower() if payload.student_email and current["role"] != "Student" else current["email"]
    with get_connection() as conn:
        student = conn.execute(
            "SELECT name, course, subjects, interests, is_demo FROM users WHERE email = ? AND role = 'Student'",
            (email,),
        ).fetchone()
        progress = conn.execute(
            "SELECT attendance, gpa, skills, streak FROM progress WHERE email = ?",
            (email,),
        ).fetchone()
    if student is None or (student["is_demo"] and not SEED_DEMO_DATA):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student profile not found.")

    question = payload.message.strip().lower()
    official_topics = ("policy", "regulation", "deadline", "fee", "exam date", "examination date", "academic calendar", "attendance requirement", "university rule", "hostel", "scholarship", "placement")
    if any(topic in question for topic in official_topics):
        answer = "I don't have verified Vignan University information for that yet. Please confirm with your faculty, department office, or university administration."
    elif "attendance" in question:
        value = progress["attendance"] if progress else None
        answer = f"Your latest recorded attendance is {value:g}%." if value is not None else "No attendance data has been recorded yet."
    elif any(term in question for term in ("gpa", "cgpa", "grade", "academic average")):
        value = progress["gpa"] if progress else None
        answer = f"Your latest recorded academic average is {value:g} out of 10." if value is not None else "No GPA or academic average has been recorded yet."
    elif "subject" in question or "course" in question:
        subjects = [item.strip() for item in (student["subjects"] or "").split(",") if item.strip()]
        answer = f"Your profile lists these subjects: {', '.join(subjects)}." if subjects else "There are no subjects listed on your profile yet."
    elif any(term in question for term in ("streak", "consistency")):
        value = progress["streak"] if progress else None
        answer = f"Your current recorded learning streak is {value} weeks." if value is not None else "No learning streak has been recorded yet."
    elif "skill" in question:
        value = progress["skills"] if progress else None
        answer = f"Your latest recorded skills growth is {value:g}%." if value is not None else "No skills assessment has been recorded yet."
    elif any(term in question for term in ("study plan", "study schedule", "prepare for exam", "exam preparation")):
        focus = progress["subject"] if progress and progress["subject"] else student["subjects"] or student["course"] or "your current subject"
        answer = f"Try a simple plan for {focus}: choose one topic, study it in a focused 25-minute block, solve a few practice questions, then write down what still needs review. I don't have your official exam dates or course requirements."
    elif any(term in question for term in ("programming", "python", "code", "debug")):
        answer = "I can help explain programming concepts or reason through code. Share the specific concept or a short code sample, and avoid including passwords, tokens, or private student data."
    elif any(term in question for term in ("career", "interview", "resume", "résumé", "cv")):
        answer = "For career preparation, pick one role to explore, compare its requirements with your current skills, and build a small project or example that demonstrates one gap you want to close. I don't have verified placement or university career-service information."
    elif any(term in question for term in ("productivity", "focus", "procrastinat", "motivation")):
        answer = "Choose one specific task, make the first step small enough to finish in five minutes, and work on it for one focused 25-minute block before taking a short break. Adjust the plan to what feels manageable today."
    else:
        answer = "I can help interpret your recorded attendance, academic average, subjects, skills, or learning streak, and offer general study planning, programming, career-preparation, or productivity ideas. I don't have a university knowledge base configured for official information yet."
    return {"answer": answer, "source": "student-records-and-general-guidance"}


@app.post("/api/students/import")
async def import_students(
    file: UploadFile = File(...),
    authorization: Optional[str] = Header(default=None),
) -> dict[str, Any]:
    current = get_current_user(authorization)
    if current["role"] not in {"Faculty", "Advisor"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only faculty and advisors can import student records.",
        )
    content = await file.read(MAX_IMPORT_SIZE_BYTES + 1)
    if len(content) > MAX_IMPORT_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail="Import files must be 5 MB or smaller.",
        )
    rows = parse_student_import(file.filename or "", content)
    if not rows:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No student records were found.")

    valid_records: list[tuple[int, StudentImportRecord]] = []
    failures: list[dict[str, Any]] = []
    for row_number, row in rows:
        try:
            valid_records.append((row_number, StudentImportRecord.model_validate(row)))
        except ValidationError as exc:
            failures.append({"row": row_number, "errors": import_validation_errors(exc)})

    created = 0
    updated = 0
    activations: list[dict[str, str]] = []
    seen_emails: set[str] = set()
    seen_registrations: set[str] = set()
    with get_connection() as conn:
        for row_number, record in valid_records:
            email = str(record.email).lower()
            registration = record.reg.strip()
            if email in seen_emails or registration.casefold() in seen_registrations:
                failures.append({"row": row_number, "errors": ["Email or registration number is duplicated in this file."]})
                continue
            seen_emails.add(email)
            seen_registrations.add(registration.casefold())

            activation_code: Optional[str] = None
            outcome = "updated"
            by_email = conn.execute(
                "SELECT * FROM users WHERE email = ?",
                (email,),
            ).fetchone()
            by_reg = conn.execute(
                "SELECT * FROM users WHERE reg = ?",
                (registration,),
            ).fetchone()
            if by_email and by_reg and by_email["id"] != by_reg["id"]:
                failures.append({"row": row_number, "errors": ["Email and registration number belong to different accounts."]})
                continue
            existing = by_email or by_reg
            if existing is not None and existing["role"] != "Student":
                failures.append({"row": row_number, "errors": ["This identity is already assigned to a staff account."]})
                continue
            if by_reg is not None and by_reg["email"] != email:
                failures.append({"row": row_number, "errors": ["Registration number is already assigned to another student."]})
                continue

            conn.execute("SAVEPOINT import_row")
            subjects = record.subjects.strip() if record.subjects else None
            interests = record.interests.strip() if record.interests else None
            if existing is None:
                activation_code = secrets.token_urlsafe(32)
                activation_hash = hashlib.sha256(activation_code.encode("utf-8")).hexdigest()
                conn.execute(
                    """
                    INSERT INTO users (
                        name, email, password, role, reg, course, year, section,
                        subjects, interests, department
                    ) VALUES (?, ?, ?, 'Student', ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        record.name.strip(),
                        email,
                        hash_password(secrets.token_urlsafe(48)),
                        registration,
                        record.course.strip(),
                        record.year.strip() if record.year else None,
                        record.section.strip() if record.section else None,
                        subjects,
                        interests,
                        record.department.strip() if record.department else None,
                    ),
                )
                conn.execute(
                    """
                    INSERT INTO account_activations (email, token_hash, expires_at, created_by)
                    VALUES (?, ?, ?, ?)
                    """,
                    (
                        email,
                        activation_hash,
                        (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
                        current["email"],
                    ),
                )
                outcome = "created"
            else:
                conn.execute(
                    """
                    UPDATE users SET
                        name = ?, reg = ?, course = ?, year = ?, section = ?,
                        subjects = ?, interests = ?, department = ?, is_demo = 0
                    WHERE id = ?
                    """,
                    (
                        record.name.strip(),
                        registration,
                        record.course.strip(),
                        record.year.strip() if record.year else None,
                        record.section.strip() if record.section else None,
                        subjects,
                        interests,
                        record.department.strip() if record.department else None,
                        existing["id"],
                    ),
                )
                if existing["is_demo"]:
                    activation_code = secrets.token_urlsafe(32)
                    activation_hash = hashlib.sha256(activation_code.encode("utf-8")).hexdigest()
                    conn.execute(
                        "UPDATE users SET password = ? WHERE id = ?",
                        (hash_password(secrets.token_urlsafe(48)), existing["id"]),
                    )
                    conn.execute(
                        "UPDATE account_activations SET used_at = ? WHERE email = ? AND used_at IS NULL",
                        (datetime.now(timezone.utc).isoformat(), email),
                    )
                    conn.execute(
                        """
                        INSERT INTO account_activations (email, token_hash, expires_at, created_by)
                        VALUES (?, ?, ?, ?)
                        """,
                        (
                            email,
                            activation_hash,
                            (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
                            current["email"],
                        ),
                    )

            progress_values = (
                record.attendance,
                record.gpa,
                record.skills,
                record.streak,
                record.subject,
                record.achievement,
                record.wellbeing,
                record.notes,
            )
            if any(value is not None for value in progress_values):
                recorded_at = datetime.now(timezone.utc).isoformat()
                conn.execute(
                    """
                    INSERT INTO progress (
                        email, attendance, gpa, skills, streak, subject, achievement, wellbeing, notes
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(email) DO UPDATE SET
                        attendance = COALESCE(excluded.attendance, progress.attendance),
                        gpa = COALESCE(excluded.gpa, progress.gpa),
                        skills = COALESCE(excluded.skills, progress.skills),
                        streak = COALESCE(excluded.streak, progress.streak),
                        subject = COALESCE(excluded.subject, progress.subject),
                        achievement = COALESCE(excluded.achievement, progress.achievement),
                        wellbeing = COALESCE(excluded.wellbeing, progress.wellbeing),
                        notes = COALESCE(excluded.notes, progress.notes)
                    """,
                    (
                        email,
                        record.attendance,
                        record.gpa,
                        record.skills,
                        record.streak,
                        record.subject,
                        record.achievement,
                        record.wellbeing,
                        record.notes,
                    ),
                )
                conn.execute(
                    """
                    INSERT INTO progress_history (
                        email, recorded_at, recorded_by, attendance, gpa, skills,
                        streak, subject, achievement, wellbeing, notes
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        email,
                        recorded_at,
                        current["email"],
                        record.attendance,
                        record.gpa,
                        record.skills,
                        record.streak,
                        record.subject,
                        record.achievement,
                        record.wellbeing,
                        record.notes,
                    ),
                )
            conn.execute("RELEASE import_row")
            if activation_code:
                activations.append({"email": email, "code": activation_code})
            if outcome == "created":
                created += 1
            else:
                updated += 1
        conn.commit()

    return {
        "successful": created + updated,
        "created": created,
        "updated": updated,
        "failed": len(failures),
        "failures": failures,
        "activations": activations,
    }


@app.post("/api/progress")
def update_progress(payload: ProgressRequest, authorization: Optional[str] = Header(default=None)) -> dict[str, Any]:
    current = get_current_user(authorization)
    if current["role"] not in {"Faculty", "Advisor"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only faculty and advisors can update verified progress.",
        )
    email = payload.email.lower()

    with get_connection() as conn:
        existing = conn.execute("SELECT role, is_demo FROM users WHERE email = ?", (email,)).fetchone()
        if not existing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Student account not found.",
            )
        if existing["role"] != "Student":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Progress can only be recorded for student accounts.",
            )
        if existing["is_demo"] and not SEED_DEMO_DATA:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student account not found.")

        recorded_at = datetime.now(timezone.utc).isoformat()
        conn.execute(
            """
            INSERT INTO progress (
                email, attendance, gpa, skills, streak, subject, achievement,
                wellbeing, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(email) DO UPDATE SET
                attendance = excluded.attendance,
                gpa = excluded.gpa,
                skills = excluded.skills,
                streak = excluded.streak,
                subject = excluded.subject,
                achievement = excluded.achievement,
                wellbeing = excluded.wellbeing,
                notes = excluded.notes
            """,
            (
                email,
                payload.attendance,
                payload.gpa,
                payload.skills,
                payload.streak,
                payload.subject,
                payload.achievement,
                payload.wellbeing,
                payload.notes,
            ),
        )
        conn.execute(
            """
            INSERT INTO progress_history (
                email, recorded_at, recorded_by, attendance, gpa, skills,
                streak, subject, achievement, wellbeing, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                email,
                recorded_at,
                current["email"],
                payload.attendance,
                payload.gpa,
                payload.skills,
                payload.streak,
                payload.subject,
                payload.achievement,
                payload.wellbeing,
                payload.notes,
            ),
        )
        conn.commit()

    saved = load_progress(email)
    return {"message": "Progress updated successfully.", "progress": saved}


@app.post("/api/reports/generate")
def generate_report(payload: ReportRequest, authorization: Optional[str] = Header(default=None)) -> dict[str, Any]:
    current = get_current_user(authorization)
    if current["role"] == "Student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Students cannot download or export their profile.",
        )

    with get_connection() as conn:
        user = conn.execute(
            "SELECT * FROM users WHERE email = ? AND role = 'Student'",
            (payload.email.lower(),),
        ).fetchone()
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found.",
            )
        if user["is_demo"] and not SEED_DEMO_DATA:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student profile not found.")
        progress = conn.execute(
            "SELECT * FROM progress WHERE email = ?",
            (payload.email.lower(),),
        ).fetchone()

    attendance_value = f"{progress['attendance']}%" if progress and progress["attendance"] is not None else "Not recorded"
    gpa_value = f"{progress['gpa']} / 10" if progress and progress["gpa"] is not None else "Not recorded"
    streak_value = f"{progress['streak']} weeks" if progress and progress["streak"] is not None else "Not recorded"
    skills_value = f"{progress['skills']}%" if progress and progress["skills"] is not None else "Not recorded"
    summary = [
        "Student Thrive progress summary",
        f"Student: {user['name']}",
        f"Registration: {user['reg'] or 'Not provided'}",
        f"Course: {user['course'] or 'Not provided'}",
        f"Attendance: {attendance_value}",
        f"Academic average: {gpa_value}",
        f"Consistency: {streak_value}",
        f"Skills growth: {skills_value}",
        f"Latest achievement: {progress['achievement'] if progress and progress['achievement'] else 'Not recorded'}",
        "Generated by authorized staff role only.",
    ]
    with get_connection() as conn:
        conn.execute(
            "INSERT INTO report_audit (generated_by, student_email, created_at) VALUES (?, ?, ?)",
            (current["email"], payload.email.lower(), datetime.now(timezone.utc).isoformat()),
        )
        conn.commit()
    return {
        "filename": f"{user['name'].lower().replace(' ', '-')}-progress-summary.txt",
        "content": "\n".join(summary),
    }


@app.get("/api/reports/history")
def report_history(
    student_email: Optional[EmailStr] = Query(default=None),
    authorization: Optional[str] = Header(default=None),
) -> dict[str, list[dict[str, str]]]:
    current = get_current_user(authorization)
    if current["role"] == "Student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Students cannot view report export history.",
        )
    query = """
        SELECT a.generated_by, a.student_email, a.created_at
        FROM report_audit a
        JOIN users u ON u.email = a.student_email
        WHERE (? = 1 OR u.is_demo = 0)
    """
    params: tuple[Any, ...] = (int(SEED_DEMO_DATA),)
    if student_email:
        query += " AND a.student_email = ?"
        params += (str(student_email).lower(),)
    query += " ORDER BY a.id DESC LIMIT 20"
    with get_connection() as conn:
        rows = conn.execute(query, params).fetchall()
    return {
        "history": [
            {
                "generated_by": row["generated_by"],
                "student_email": row["student_email"],
                "created_at": row["created_at"],
            }
            for row in rows
        ]
    }


init_db()
