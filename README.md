# Student Thrive

Student Thrive is a student-success dashboard prototype for students, faculty,
and advisors. It brings academic progress, attendance, skills, achievements,
well-being signals, and progress history into one role-based web application.


## What it does

- **Student dashboard:** view recorded academic and attendance progress,
  achievements, skills, well-being information, and available progress history.
- **Faculty and advisor dashboard:** browse student records, update progress,
  review history, import student data, and generate student reports.
- **Student onboarding:** new students added by staff receive a one-time
  activation code. They use it to set a password before signing in.
- **Bulk intake:** import student records and optional progress snapshots from
  CSV, JSON, or Excel (`.xlsx`/`.xlsm`) files. The importer validates records
  and reports invalid or duplicate rows.
- **Study assistant:** ask about recorded information or get general study
  guidance. It is not connected to an official university policy knowledge
  base.
- **Well-being check-in:** the interface includes a DASS assessment. It is a
  self-report check-in, not a diagnosis or substitute for professional care.

This project is a prototype. Do not treat its assistant or well-being features
as an official source of university policy or as professional advice.

## Technology

- **Frontend:** React, TypeScript, Vite, Recharts, and Lucide icons.
- **Backend:** Python, FastAPI, and SQLite.
- **Authentication:** role-based accounts and signed bearer tokens.
- **Data import:** CSV/JSON parsing and Excel workbook support.

## Run locally on Windows

Use two PowerShell terminals from the project root.

### 1. Install dependencies

```powershell
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
npm.cmd install
```

If PowerShell permits npm scripts on your machine, `npm` can be used instead
of `npm.cmd`.

### 2. Start the backend

```powershell
.\.venv\Scripts\python.exe -m uvicorn backend.app:app --reload --host 127.0.0.1 --port 8000
```

The API is available at `http://127.0.0.1:8000`. Interactive API
documentation is at `http://127.0.0.1:8000/docs`.

### 3. Start the frontend

In the second terminal:

```powershell
npm.cmd run dev
```

Open the Vite URL printed in the terminal (normally
`http://localhost:5173`). The Vite development server proxies `/api` requests
to the backend on port `8000`.

## Account and sign-in information

- Students can register through the student flow, or staff can add them through
  the student import. Imported new accounts are not ready to sign in until
  activated.
- Staff must provide a newly imported student their one-time activation code
  through a secure channel. Codes expire after seven days and are returned only
  once to the authorized importer.
- Faculty and advisor accounts cannot self-register; they must be provisioned
  by an administrator. Sign in with the assigned email and password and choose
  the matching role.
- New passwords must contain at least eight characters.
- Demo accounts and seed data are disabled by default.

## Importing student and attendance data

From the Faculty or Advisor dashboard, open **Import student records**, select a
CSV, JSON, or Excel file, and submit it. Files are limited to **5 MB** and
**2,000 records**.

Each record must include these columns:

| Required field | Accepted column names |
| --- | --- |
| Student name | `name`, `student_name` |
| Email | `email`, `email_address`, `university_email` |
| Registration number | `reg`, `registration_number`, `registration_no`, `reg_number` |
| Course | `course`, `current_course` |

Progress fields are optional. For an attendance sheet, include the required
student identity fields above and an `attendance` column with a percentage from
0 to 100. Other supported progress fields include `gpa` (0–10), `skills`
(0–100), `streak`, `subject`, `achievement`, `wellbeing`, and `notes`. Column
names are normalized, and some common aliases such as `cgpa` and
`academic_average` are accepted.

Example CSV:

```csv
name,email,registration_number,course,attendance,gpa
Ananya Rao,ananya@example.edu,STU-2024-0201,Computer Science,91,8.7
```

The import result shows created, updated, and failed rows. Existing student
accounts retain their login credentials when their records are updated.

## Configuration

Configuration is read from the backend process environment. The root
`.env.example` and `backend/.env.example` are templates; the application does
not automatically load `.env` files.

| Variable | Purpose |
| --- | --- |
| `STUDENT_THRIVE_ENV` | Environment name; defaults to `development`. |
| `STUDENT_THRIVE_JWT_SECRET` | Secret used to sign login tokens. Set a random value of at least 32 characters outside development. |
| `STUDENT_THRIVE_CORS_ORIGINS` | Comma-separated allowed browser origins. Local defaults include ports 5173 and 5174. |
| `STUDENT_THRIVE_SEED_DEMO_DATA` | Enable clearly marked demo records in a new development database only; defaults to `false`. |
| `STUDENT_THRIVE_DB_PATH` | Optional SQLite database path; defaults to `backend/student_thrive.db`. |

For example, set variables for the current PowerShell session before starting
the API:

```powershell
$env:STUDENT_THRIVE_ENV = "development"
$env:STUDENT_THRIVE_JWT_SECRET = "replace-with-a-random-secret-at-least-32-characters"
$env:STUDENT_THRIVE_CORS_ORIGINS = "http://localhost:5173,http://localhost:5174"
```

Never use a development secret in staging or production. Demo data is rejected
outside development. For multi-instance deployments, replace the in-process
login rate limiter with shared storage such as Redis.

## API overview

All API paths are prefixed with `/api`.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/health`, `/health/ready` | Liveness and database readiness checks. |
| `POST` | `/auth/login`, `/auth/register`, `/auth/activate` | Sign in, student registration, and activation. |
| `GET` | `/me`, `/students` | Current account and student directory. |
| `GET` | `/students/{student_email}/progress/history` | Recorded progress history. |
| `POST` | `/students/import` | Faculty/advisor student data import. |
| `POST` | `/progress` | Faculty/advisor progress update. |
| `POST` | `/assistant/chat` | Record-grounded and general study guidance. |
| `POST` | `/reports/generate` | Generate a student report. |
| `GET` | `/reports/history` | View report audit history. |

Progress history is append-only and records verified updates or imported
snapshots; earlier snapshots are not fabricated into historical entries.
Report generation is audited. Student profile export is blocked by both the
interface and API.

## Build and tests

```powershell
npm.cmd run build
.\.venv\Scripts\python.exe -m unittest backend.test_app -v
```

The API tests use a temporary SQLite database.

## Project layout

```text
backend/
  app.py                 FastAPI application and API routes
  test_app.py            Backend regression tests
  requirements.txt       Python dependencies
  student_thrive.db      Local SQLite database (created/used by the backend)
src/
  main.tsx               React application and dashboard UI
  api.ts                 Frontend API client and data types
  ...                    Supporting views, styles, and components
```
