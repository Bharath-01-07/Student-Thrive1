# Student Thrive Deployment Guide

This guide covers local setup and deployment preparation. The project is a prototype and should not be considered production-ready without completing the checklist below.

---

## 1. Project Summary

Student Thrive is a React + TypeScript frontend and FastAPI backend application for student growth tracking.

It includes:

- student login and registration
- faculty and advisor role access
- progress tracking
- dashboard views for academic and attendance data
- wellbeing assessment
- staff report generation
- SQLite-backed persistence

---

## 2. Project Structure

```text
Student Thrive/
├── backend/
│   ├── app.py
│   ├── test_app.py
│   ├── README.md
│   └── student_thrive.db
├── src/
│   ├── main.tsx
│   ├── RegistrationPage.tsx
│   ├── ProgressPage.tsx
│   ├── styles.css
│   └── vite-env.d.ts
├── index.html
├── package.json
├── README.md
├── PROJECT_READING_FILE.md
├── DEPLOYMENT_GUIDE.md
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── vite.config.ts
├── vite.config.js
├── .gitignore
├── .venv/
├── dist/
└── scripts/
    └── make-share-file.mjs
```

---

## 3. Requirements

### For frontend
- Node.js 18+
- npm

### For backend
- Python 3.10+
- pip

### Recommended
- Git
- VS Code
- virtual environment tool

---

## 4. Clone or Move the Project

On the new machine:

```bash
git clone <your-repo-url>
cd Student\ Thrive
```

If you are moving the project manually, keep the full folder together and make sure the `.venv` folder is included if you want the exact environment preserved.

---

## 5. Install Frontend Dependencies

From the project root:

```bash
npm install
```

---

## 6. Set Up Python Environment

From the project root, use the commands for your operating system.

### Windows PowerShell

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r backend\requirements.txt
```

### macOS or Linux

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r backend/requirements.txt
```

If the project already has a `.venv` folder, activate it instead of creating it again.

---

## 7. Run the Backend

### Windows PowerShell

```powershell
.\.venv\Scripts\Activate.ps1
python -m uvicorn backend.app:app --host 127.0.0.1 --port 8000
```

### macOS or Linux

```bash
source .venv/bin/activate
python -m uvicorn backend.app:app --host 127.0.0.1 --port 8000
```

The backend should run on:

```text
http://localhost:8000
```

API health check:

```bash
curl http://localhost:8000/api/health
```

Expected response:

```json
{"status":"ok","service":"student-thrive-api"}
```

---

## 8. Run the Frontend

Open a second terminal and run:

```bash
npm run dev -- --host 0.0.0.0
```

Frontend will typically run at:

```text
http://localhost:5173
```

---

## 9. Demo Data

Demo records are disabled by default. For local development only, set
`STUDENT_THRIVE_SEED_DEMO_DATA=true` before starting the API to seed a new,
empty development database. The API marks those records as demo data; they are
not university accounts and must never be used in a public deployment.
- Role: Advisor

---

## 10. Environment Variables

Copy `.env.example` to `.env` and configure the backend process environment. The backend reads these variables directly; a `.env` file is a template and is not loaded automatically unless your process manager or shell loads it.

### Required for production-like deployment

```bash
STUDENT_THRIVE_JWT_SECRET=your-very-secure-random-secret-at-least-32-chars
STUDENT_THRIVE_CORS_ORIGINS=https://your-frontend.example
STUDENT_THRIVE_ENV=production
STUDENT_THRIVE_SEED_DEMO_DATA=false
```

For local development, the default database is `backend/student_thrive.db`. You can override it with `STUDENT_THRIVE_DB_PATH`. Do not commit secrets or production student data.

---

## 11. Build for Production

Frontend build:

```bash
npm run build
```

This creates the `dist/` folder.

Shareable HTML export:

```bash
npm run build:share
```

This creates a portable share file in:

```text
dist/student-thrive-share.html
```

---

## 12. Run Tests

Backend tests:

```bash
source .venv/bin/activate
python -m unittest backend.test_app -v
```

Or via npm script:

```bash
npm run test:api
```

---

## 13. Backend API Notes

The FastAPI app includes:

- `/api/health`
- `/api/health/ready`
- `/api/auth/login`
- `/api/auth/register`
- `/api/auth/activate`
- `/api/me`
- `/api/students`
- `/api/students/import`
- `/api/progress`
- `/api/assistant/chat`
- `/api/reports/generate`
- `/api/reports/history`
- `/api/reports/history`

These routes are used by the frontend.

Staff can import CSV, JSON, XLSX, and XLSM student files at `POST /api/students/import` (maximum 5 MB and 2,000 records). Newly created accounts receive one-time activation codes, valid for seven days; deliver codes to students through a secure channel. The `/api/assistant/chat` endpoint uses recorded student data and general guidance only. It has no official university policy, calendar, fees, or placement knowledge base.

---

## 14. Database Notes

The project uses SQLite locally.

Database file:

```text
backend/student_thrive.db
```

This is a local file-based database and is fine for development or demo use.

For production deployment, a more scalable database like PostgreSQL is recommended.

---

## 15. Deployment Preparation

Before deploying to a public host, complete the following:

### Required
- move from SQLite to PostgreSQL or another managed DB
- set strong production environment variables
- set CORS to the real deployed frontend URL
- configure HTTPS
- ensure the backend is reachable from the frontend
- configure frontend API URL to point to deployed backend

### Recommended
- add monitoring
- configure logs
- set health checks
- enable backups
- add CI pipeline for tests

---

## 16. Recommended Hosting Setup

### Option A: Frontend + Backend on separate platforms

- Frontend: Vercel or Netlify
- Backend: Render or Railway
- Database: PostgreSQL managed instance

### Option B: Full app on one platform

- Azure App Service
- Railway
- Render

This is easier for smaller projects.

---

## 17. Production Deployment Checklist

Before releasing publicly, confirm:

- [ ] JWT secret is strong and unique
- [ ] debug mode is off
- [ ] CORS is set to real frontend URL
- [ ] DB is not using local SQLite in production
- [ ] frontend uses deployed backend URL
- [ ] HTTPS is enabled
- [ ] tests still pass
- [ ] health checks respond correctly
- [ ] login works in production
- [ ] registration works in production
- [ ] report generation works in production

---

## 18. Quick Start Commands

### Fresh setup

```bash
npm install
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
```

### Run locally

```bash
source .venv/bin/activate
uvicorn backend.app:app --host 0.0.0.0 --port 8000
```

```bash
npm run dev -- --host 0.0.0.0
```

### Run full API test suite

```bash
source .venv/bin/activate
python -m unittest backend.test_app -v
```

---

## 19. Final Note

Keep the workspace together when moving it to another device, then install dependencies using the setup above. Before public deployment, complete the checklist: configure production secrets and HTTPS, use a managed database, verify the deployed frontend/API configuration, and complete security and privacy reviews.
