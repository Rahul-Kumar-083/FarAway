# EXAMOS 🧠

## AI Adaptive Examination & Integrity Platform

> Future AI Infrastructure for Examinations

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Python](https://img.shields.io/badge/Python-3.11-yellow?logo=python)
![Tailwind](https://img.shields.io/badge/Tailwind-v4-38bdf8?logo=tailwindcss)

---

## 🌟 Features

### 🧠 Adaptive Examination Engine
- Dynamic difficulty adjustment (1-5 scale)
- Correct answer → harder question (+1)
- Wrong answer → easier question (-1)
- Real-time difficulty tracking per student

### 🛡️ AI Anti-Cheat Monitoring
- **Tab switch detection** — flagged when student leaves the exam tab
- **Fullscreen exit detection** — monitors if student exits fullscreen
- **Multiple face detection** — alerts when more than one face is detected
- **No face detection** — alerts when student leaves the camera
- **Real-time Trust Score** — 0-100 score deducted per violation

### ✨ AI Question Generator
- Upload PDF documents
- AI generates MCQs with difficulty labels (Gemini API)
- **Fallback template generation** when API is unavailable
- Teacher review/edit workflow before publishing

### 📊 Analytics Dashboard
- Student: accuracy trends, topic radar, difficulty distribution
- Teacher: class-level stats, question performance, exam analytics
- Interactive charts powered by Recharts

---

## 🏗️ Architecture

```
Frontend (Next.js 15 + Tailwind v4)
        ↓ REST + WebSocket
FastAPI Backend (Python 3.11)
        ↓
AI Services
 ├── Adaptive Engine (difficulty_engine + question_selector)
 ├── Anti-Cheat (trust_score_engine - client-side detection)
 ├── Question Generator (Gemini API + fallback)
 └── Analytics Engine
        ↓
SQLite (dev) / PostgreSQL (production)
```

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** ≥ 18
- **Python** ≥ 3.10
- **Git**

### 1. Clone & Setup

```bash
cd EXAMOS
cp .env.example .env
```

### 2. Start Backend

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

The backend will:
- Create SQLite database automatically
- Seed demo users and a sample exam
- Open Swagger docs at http://localhost:8000/docs

### 3. Start Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000

---

## 🔑 Demo Credentials

| Role    | Email               | Password     |
|---------|---------------------|--------------|
| Teacher | teacher@examos.ai   | teacher123   |
| Student | student@examos.ai   | student123   |
| Admin   | admin@examos.ai     | admin123     |

---

## 🐳 Docker Setup

```bash
# Start all services (PostgreSQL + Backend + Frontend)
docker-compose up --build

# Access:
# Frontend: http://localhost:3000
# Backend:  http://localhost:8000
# API Docs: http://localhost:8000/docs
```

---

## 📡 API Documentation

Interactive Swagger docs available at `http://localhost:8000/docs`

### Key Endpoints

#### Authentication
```
POST /api/auth/login     — Login with email/password
GET  /api/auth/me        — Get current user profile
```

#### Exams
```
GET    /api/exams/                    — List exams
POST   /api/exams/                    — Create exam (teacher)
GET    /api/exams/{id}                — Get exam details
PATCH  /api/exams/{id}                — Update exam
GET    /api/exams/{id}/questions      — Get questions (teacher)
POST   /api/exams/{id}/questions      — Add questions
```

#### Exam Attempts
```
POST /api/exams/attempts/start                — Start exam
GET  /api/exams/attempts/{id}/next-question   — Get next adaptive question
POST /api/exams/attempts/{id}/answer          — Submit answer
POST /api/exams/attempts/{id}/submit          — Finish exam
```

#### AI Generation
```
POST /api/ai/generate-questions   — Upload PDF, get AI-generated questions
```

#### Monitoring
```
POST /api/monitoring/events              — Report anti-cheat event
GET  /api/monitoring/trust-score/{id}    — Get trust score
```

#### Analytics
```
GET /api/analytics/student        — Student analytics
GET /api/analytics/exam/{id}      — Exam analytics (teacher)
GET /api/analytics/class          — Class analytics (teacher)
```

#### WebSocket
```
ws://localhost:8000/ws/exam/{attempt_id}?token=JWT    — Real-time exam monitoring
ws://localhost:8000/ws/monitor?token=JWT               — Teacher monitoring feed
```

### Example API Requests

```bash
# Login
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "teacher@examos.ai", "password": "teacher123"}'

# Generate questions from PDF
curl -X POST http://localhost:8000/api/ai/generate-questions \
  -H "Authorization: Bearer <token>" \
  -F "file=@notes.pdf" \
  -F "num_questions=10"

# Start exam
curl -X POST http://localhost:8000/api/exams/attempts/start \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"exam_id": 1}'
```

---

## 📁 Project Structure

```
EXAMOS/
├── frontend/                  # Next.js 15 + TypeScript + Tailwind v4
│   ├── src/
│   │   ├── app/              # App Router pages
│   │   │   ├── login/        # Login page
│   │   │   ├── dashboard/    # Role-based dashboard
│   │   │   ├── student/      # Student pages (exam, result, analytics)
│   │   │   └── teacher/      # Teacher pages (upload, exams, analytics, monitoring)
│   │   ├── context/          # React contexts (Auth)
│   │   ├── hooks/            # Custom hooks (useAntiCheat, useWebSocket)
│   │   └── services/         # API client
│   └── Dockerfile
│
├── backend/                   # FastAPI + Python
│   ├── app/
│   │   ├── main.py           # Application entry point
│   │   ├── config/           # Settings
│   │   ├── database/         # SQLAlchemy connection + seed data
│   │   ├── models/           # Database models
│   │   ├── schemas/          # Pydantic schemas
│   │   ├── routes/           # API endpoints
│   │   ├── services/         # Business logic
│   │   ├── middleware/       # Auth middleware
│   │   └── ai/               # AI services
│   │       ├── adaptive_engine/    # Difficulty adjustment
│   │       ├── anti_cheat/         # Trust score computation
│   │       ├── question_generation/ # PDF → Questions pipeline
│   │       └── analytics/          # Analytics computation
│   └── Dockerfile
│
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## 🎨 UI Design

- **Theme**: Dark futuristic with glassmorphism
- **Colors**: Deep blue/purple gradients with indigo accents
- **Typography**: Inter (Google Fonts)
- **Components**: Custom glassmorphism cards, animated stats, progress bars
- **Charts**: Recharts (line, radar, bar charts)
- **Responsive**: Mobile-friendly dashboards, desktop-only exam proctoring

---

## ⚙️ Environment Variables

| Variable               | Description                           | Default                              |
|------------------------|---------------------------------------|--------------------------------------|
| `DATABASE_URL`         | Database connection string            | `sqlite+aiosqlite:///./examos.db`    |
| `JWT_SECRET`           | Secret key for JWT tokens             | `dev-secret-key...`                  |
| `JWT_EXPIRATION_MINUTES`| Token expiry in minutes              | `1440` (24h)                         |
| `GEMINI_API_KEY`       | Google Gemini API key (optional)      | empty (uses fallback)                |
| `FRONTEND_URL`         | Frontend URL for CORS                 | `http://localhost:3000`              |
| `MAX_UPLOAD_SIZE_MB`   | Max PDF upload size                   | `10`                                 |

---

## 🔒 Security

- JWT-based authentication with bcrypt password hashing
- Role-based access control (student, teacher, admin)
- CORS configured for frontend origin
- WebSocket authentication via query parameter token
- File upload validation (type + size)

---

## 📋 Demo Flow

1. **Teacher** logs in → uploads PDF → AI generates questions → reviews/edits → creates exam → publishes
2. **Student** logs in → browses active exams → starts adaptive exam → anti-cheat monitors → timer counts down
3. **Teacher** opens monitoring dashboard → sees live trust scores → receives event alerts
4. **Student** finishes exam → sees results with score + trust score breakdown
5. **Both** check analytics → view trends, weak topics, difficulty performance

---

## 🛠️ Tech Stack

| Layer      | Technology                                          |
|------------|-----------------------------------------------------|
| Frontend   | Next.js 15, React, TypeScript, Tailwind CSS v4      |
| Backend    | FastAPI, Python 3.11, SQLAlchemy (async)             |
| Database   | SQLite (dev) / PostgreSQL (production)               |
| AI/ML      | Google Gemini API, PyMuPDF                           |
| Real-time  | WebSocket (native FastAPI)                           |
| Auth       | JWT (PyJWT) + bcrypt                                 |
| Charts     | Recharts                                             |
| Deployment | Docker, Docker Compose                               |

---

Built with ❤️ for the future of education.
