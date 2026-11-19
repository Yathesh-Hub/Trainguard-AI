# TrainGuard AI
## AI-Based Training Centre Attendance & Infrastructure Compliance Monitoring System

TrainGuard AI is an enterprise-grade AI-powered web platform designed to monitor, audit, and evaluate training centre compliance. It replaces legacy, manual on-site checks and disjointed spreadsheets with automated data ingestion, AI-driven anomaly detection, computer vision infrastructure analysis, multi-factor compliance scoring, and downloadable PDF reports.

Built with **React.js (Vite + Tailwind CSS)**, **Python FastAPI**, and **Supabase (PostgreSQL, Auth, Storage, and Row Level Security)**.

---

## 1. System Architecture

```
+-------------------------------------------------------------------------+
|                           TRAINGUARD AI FRONTEND                        |
|   React.js • Vite • Tailwind CSS • React Router • Axios • Recharts      |
|   @supabase/supabase-js (Client Auth & Session Management)              |
+------------------------------------+------------------------------------+
                                     |  REST API / Bearer JWT
                                     v
+-------------------------------------------------------------------------+
|                            FASTAPI BACKEND                              |
|   Authentication & JWT Verification • Role-Based Access Control         |
|   OpenCV Vision Pipeline • Scikit-Learn Isolation Forest Engine         |
|   ReportLab PDF Generator • Pandas & OpenPyXL File Ingestion            |
+------------------------------------+------------------------------------+
                                     |  Supabase Python SDK (supabase-py)
                                     v
+-------------------------------------------------------------------------+
|                           SUPABASE PLATFORM                             |
|  * Supabase PostgreSQL: 15 Relational Tables with Foreign Keys & UUIDs  |
|  * Supabase Auth: Secure user management and JWT issuance               |
|  * Row Level Security (RLS): Multi-tenant isolation (Admin vs Manager)  |
|  * Supabase Storage: Private buckets (attendance, images, reports)      |
+-------------------------------------------------------------------------+
```

---

## 2. Key Features

- **Supabase PostgreSQL & Auth:** Full migration away from local PostgreSQL. Authentication uses Supabase Auth with JWT verification in FastAPI. Plain-text passwords are never stored.
- **Row Level Security (RLS):** Database policies ensure Administrators manage all authorized centres, while Centre Managers access only their assigned centre.
- **Attendance Ingestion & Analytics:** Uploads Excel (`.xlsx`, `.xls`) or CSV files. Automatically validates records, skips duplicates, detects unknown student IDs, computes attendance rates, and flags students below the 75% compliance threshold.
- **AI Anomaly Detection:** Scikit-Learn Isolation Forest and statistical heuristic tests detect sudden attendance drops, repeated identical status patterns, trainer availability discrepancies, and missing dates.
- **Infrastructure Computer Vision:** Evaluates classroom photographs using an OpenCV image processing pipeline (luminance analysis for lighting lux, HSV color segmentation for fire extinguishers, contour geometry for whiteboards, computers, and furniture). Uncertain detections are flagged for human auditor verification.
- **Multi-Factor Compliance Scoring Engine:** Calculates composite compliance score based on configurable weights:
  $$\text{Compliance Score} = (\text{Attendance} \times 0.35) + (\text{Trainer} \times 0.20) + (\text{Infrastructure} \times 0.30) + (\text{Documentation} \times 0.15)$$
- **PDF Report Generation:** Compiles formal compliance reports, student attendance audits, and regional digests using ReportLab.
- **Private Storage & Signed URLs:** All uploaded attendance rosters, classroom photographs, and generated PDF certificates are kept in private Supabase Storage buckets, accessed via signed URLs.

---

## 3. Technology Stack

- **Frontend:** React 18, Vite, Tailwind CSS, React Router v6, Axios, Recharts, Lucide React, `@supabase/supabase-js`
- **Backend:** Python 3.12, FastAPI, Pydantic v2, Supabase Python SDK (`supabase-py`), Python-Jose, Passlib, Uvicorn
- **AI / Computer Vision / ML:** OpenCV (`opencv-python`), Scikit-Learn (`scikit-learn`), Pandas, NumPy
- **Document & PDF Processing:** ReportLab, OpenPyXL, Pillow
- **Database & Storage:** Supabase PostgreSQL, Supabase Storage, Supabase Row Level Security (RLS)

---

## 4. Supabase Setup Instructions

### Step 1: Create a Supabase Project
1. Go to [https://supabase.com](https://supabase.com) and sign in.
2. Click **New Project** and name it `trainguard-ai`.
3. Set your database password and choose your preferred cloud region.

### Step 2: Retrieve API Keys & Credentials
In the Supabase Dashboard, navigate to **Project Settings -> API**:
- **Project URL:** e.g., `https://abcdefghijkl.supabase.co`
- **anon / public key:** Publishable key used in frontend.
- **service_role secret key:** Privileged key used ONLY by the FastAPI backend.
- **JWT Secret:** (under JWT Settings) Used to cryptographically verify Supabase JWTs.

### Step 3: Run Database SQL Scripts
Open the **SQL Editor** in the Supabase Dashboard and run the following scripts in order:

1. **`database/schema.sql`**: Creates the 15 database tables, UUID extensions, foreign keys, indexes, and automated timestamp triggers.
2. **`database/rls_policies.sql`**: Enables Row Level Security (RLS) and attaches role-based security policies for Admins and Centre Managers.
3. **`database/storage_policies.sql`**: Initializes private storage buckets (`attendance-files`, `infrastructure-images`, `reports`) and object access policies.
4. **`database/seed.sql`**: Populates demonstration data (5 centres, 100 students, 15 trainers, 10 batches, 30 days of attendance, infrastructure findings, and anomalies).

---

## 5. Environment Variables Configuration

Copy `.env.example` to both `backend/.env` and `frontend/.env`:

### Backend `.env`:
```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_JWT_SECRET=your-supabase-jwt-secret
BACKEND_PORT=8000
BACKEND_HOST=0.0.0.0
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
ALLOW_LOCAL_FALLBACK=true
```

### Frontend `.env`:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_API_BASE_URL=http://localhost:8000/api
```

*(Note: If `SUPABASE_URL` is left unconfigured, the application automatically runs in local managed provider mode using the pre-seeded dataset, allowing immediate local evaluation).*

---

## 6. Running Locally

### 1. Start the FastAPI Backend:
```bash
# Navigate to backend and install dependencies (if not already installed)
pip install fastapi uvicorn supabase pydantic-settings email-validator python-jose passlib bcrypt opencv-python scikit-learn pandas reportlab openpyxl pillow

# Start backend server
cd backend
python -m uvicorn main:app --reload --port 8000
```
Backend API interactive documentation is available at: `http://localhost:8000/docs`

### 2. Start the React Frontend:
```bash
# In a separate terminal, start the Vite frontend
cd frontend
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 7. Default Demonstration Accounts

The system includes pre-configured demo user accounts:

| Role | Email | Password | Access Scope |
| :--- | :--- | :--- | :--- |
| **System Administrator** | `admin@trainguard.ai` | `Password123!` | Full administrative access across all 5 centres |
| **Apex Centre Manager** | `manager@apex.trainguard.ai` | `Password123!` | Centre Manager restricted to Apex Skill Academy (TC-101) |

*(Quick 1-click login buttons are provided on the Login page for convenience).*

---

## 8. Database Tables Overview

| Table | Purpose |
| :--- | :--- |
| `profiles` | User accounts linked to Supabase Auth UUIDs, roles (`admin`, `centre_manager`), and centre jurisdiction |
| `training_centres` | Training centre records with codes, capacity, contact information, and operating status |
| `students` | Student rosters with unique student ID, batch, course, and centre assignment |
| `trainers` | Faculty records, assigned subject domains, and centre links |
| `batches` | Academic cohort schedules, courses, and time slots |
| `attendance_records` | Student daily attendance logs with status (`present`, `absent`, `late`, `excused`) |
| `trainer_attendance` | Faculty session attendance and conducted teaching hours |
| `training_sessions` | Scheduled curriculum classes and actual delivery dates |
| `infrastructure_requirements` | Standard baseline specifications (Furniture, Projector, PCs, Fire Extinguisher, Lighting, etc.) |
| `infrastructure_inspections` | Inspection records linked to uploaded classroom photographs |
| `infrastructure_findings` | Computer vision detections with confidence scores, bounding boxes, and auditor verification |
| `anomaly_records` | Flagged irregularities with severity, anomaly category, and evidence JSON |
| `compliance_scores` | Multi-factor weighted compliance scores and tailored improvement recommendations |
| `uploaded_documents` | File metadata, storage bucket paths, and signed URL references |
| `audit_logs` | Immutable audit trail of administrative modifications and batch operations |

---

## 9. Running Tests

Run the test suite covering authentication, RLS authorization, attendance parsing, CV image detection, compliance scoring, and PDF generation:

```bash
python -m pytest backend/tests/test_api.py -v
```

All 12 test modules test the system end-to-end.
