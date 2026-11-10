# Student Thrive Project Reading File

## 1. Project Overview

Student Thrive is a dashboard-first prototype for helping students, faculty, and advisors track academic progress in one place. The app is designed to unify signals such as attendance, academic performance, skills growth, achievements, well-being, and progress trends into a single student growth experience.

The core goal is to make student development easier to understand and support. Instead of looking at separate reports or fragmented records, users can see a clearer story of how a student is progressing over time.

---

## 2. What the project does

This project includes:

- Student login and registration
- Faculty and advisor access
- Student progress tracking
- Growth dashboard views
- Attendance monitoring
- Academic overview
- Skills and consistency data
- Well-being check-in screens
- Achievement tracking
- Report generation for staff
- Role-based access control

It is designed as a student success platform rather than only a marks portal.

---

## 3. Tech Stack

### Frontend
- React
- TypeScript
- Vite
- Recharts
- Lucide React

### Backend
- FastAPI
- SQLite
- JWT authentication
- Password hashing using PBKDF2

### Key Project Files
- `package.json` — scripts and dependencies
- `README.md` — setup and usage instructions
- `src/main.tsx` — main app logic and dashboard
- `src/RegistrationPage.tsx` — registration UI
- `src/ProgressPage.tsx` — progress update form
- `src/styles.css` — styling and layout
- `backend/app.py` — backend API and database logic
- `backend/test_app.py` — API regression tests

---

## 4. Frontend Structure

The main frontend app is located in `src/main.tsx`.

This file contains:

- authentication logic
- registration flow
- login flow
- student dashboard rendering
- faculty/advisor views
- profile modals
- support chat UI
- DASS mental well-being assessment
- progress form logic
- staff report publishing flow

The app uses React state to keep track of:

- selected role
- current user
- selected student
- progress form values
- registration data
- notifications
- search results
- chart state

---

## 5. Registration System

The registration UI is built in `src/RegistrationPage.tsx`.

Students fill in:

- full name
- email
- password
- registration number
- course
- year
- section
- subjects
- interests
- details

Faculty and advisors fill in:

- full name
- email
- password
- employee ID
- department

The backend validates these values before creating a profile.

For student accounts, valid registration numbers are checked by regex rules. For staff accounts, employee ID and department are required.

---

## 6. Progress Recording

The progress form is in `src/ProgressPage.tsx`.

Users can update:

- attendance percentage
- academic average (GPA / score out of 10)
- skills growth percentage
- consistency streak
- current subject
- recent achievement
- well-being status
- notes

These values are submitted to the backend via `/api/progress` and saved to the SQLite `progress` table.

The backend checks:

- attendance must be between 0 and 100
- GPA must be between 0 and 10
- skills must be between 0 and 100
- streak must be non-negative

This helps ensure valid student data and prevents bad input.

---

## 7. Backend Architecture

The API is created in `backend/app.py` using FastAPI.

It includes:

- `/api/health` — health check route
- `/api/health/ready` — readiness check to verify database access
- `/api/auth/login` — login endpoint
- `/api/auth/register` — registration endpoint
- `/api/me` — current authenticated user
- `/api/students` — view students
- `/api/progress` — update student progress
- `/api/reports/generate` — generate staff report
- `/api/reports/history` — list report history

These endpoints provide the full user workflow from sign-in to progress management.

---

## 8. Database Design

The backend uses SQLite with a database file under the backend folder.

There are three main tables:

### 1. `users`
Stores all accounts:

- id
- name
- email
- password
- role
- reg
- course
- year
- section
- subjects
- interests
- details
- department
- employee_id

### 2. `progress`
Stores the student progress records:

- id
- email
- attendance
- gpa
- skills
- streak
- subject
- achievement
- wellbeing
- notes

### 3. `report_audit`
Stores report activity:

- id
- generated_by
- student_email
- created_at

This is useful for auditing who generated a report and when.

---

## 9. Authentication and Security

The backend is more secure than a basic mock app.

Features implemented:

- password hashing with PBKDF2
- JWT token creation
- JWT validation for protected routes
- CORS configuration
- login rate limiting
- security headers
- use of secure defaults in production

The app also prevents users from performing certain actions when they are not authorized.

Examples:

- Students cannot view staff report history
- Students cannot generate reports
- Students can only update their own progress
- Faculty and advisors can update student records

These checks are enforced by the backend.

---

## 10. Faculty and Advisor Workflow

The staff dashboard is designed to help faculty and advisors monitor student outcomes.

It includes:

- student directory listing
- summary metrics such as average attendance and average GPA
- risk detection for students needing support
- form to update academic and attendance data
- report generation flow

This makes the project useful for institutional support instead of just individual user dashboards.

---

## 11. Reports Feature

The app supports report generation in the backend.

A staff user can generate a progress summary for a student. The API creates a plain text report with values like:

- student name
- registration number
- course
- attendance
- academic average
- consistency streak
- skills growth
- latest achievement

The report is saved in the `report_audit` table so the backend records who created it and when.

This allows a staff workflow that is more accountable and traceable.

---

## 12. Well-being and Support Features

The app includes a DASS-21 style support check-in.

This feature:

- asks a series of questions about emotional well-being
- calculates scores for depression, anxiety, and stress
- gives a supportive message based on the result
- is framed as a non-diagnostic screening tool

This shows the project is not only about grades; it also considers student support and emotional health.

---

## 13. AI Support Chat

The app includes a support chat panel with a guide-like assistant.

The purpose is to simulate a supportive coach that helps explain progress patterns and recommends next steps.

Examples of chat prompts:

- What should I focus on next?
- Summarize my progress

This is more of a prototype coaching interface, but it fits the market idea of an educational growth assistant.

---

## 14. Data Flow in Plain English

A simple lifecycle for the app is:

1. A user signs in or registers.
2. The frontend stores the token in local storage.
3. The frontend requests user data from the backend.
4. The backend loads the account and any progress data from SQLite.
5. The dashboard renders the student’s growth information.
6. The user updates metrics or a staff member publishes new data.
7. The backend validates it and saves it.
8. The UI refreshes to show the new data.

This is the overall flow of how the app works.

---

## 15. Why this project is valuable

This project is useful because it combines multiple concerns in one product:

- academic monitoring
- student wellbeing
- staff review workflows
- progress storytelling
- profile management
- secure authentication

It is built as a realistic educational product prototype that could be extended into a full production app.

The design theme is warm, supportive, and student-focused. It avoids a purely cold corporate dashboard feel and instead uses brighter, more human visual communication.

---

## 16. How to Run the Project

### Frontend
```bash
npm install
npm run dev
```

### Backend
```bash
source .venv/bin/activate
uvicorn backend.app:app --host 0.0.0.0 --port 8000
```

The frontend expects the API on port 8000. Vite is configured to proxy `/api` requests appropriately.

---

## 17. Project Summary

Student Thrive is a student growth and support platform that helps people understand progress in a human, clear, and actionable way. It blends academic data, behavioral signals, and support information into a single interface that is meant to reduce confusion and make growth easier to track.

The project combines modern frontend UX with a working backend and database system, making it a solid prototype of a real educational support application.

---

## 18. Final Takeaway

The real value of Student Thrive is not just that it shows charts and numbers. It is that it tries to tell the story behind the numbers: attendance, academic work, effort, consistency, emotional wellbeing, and growth over time.

That makes it more than a dashboard — it is designed as a supportive learning and advising system.
