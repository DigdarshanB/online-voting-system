# Online Voting System (Final Year Project)

A web-based online voting system with separate **Voter** and **Admin** portals, backed by a **FastAPI** REST API and **MySQL** database (Docker). This repository contains the complete full-stack source code and development setup.

---

## Tech Stack
- **Frontend (Voter + Admin):** React (Vite), React Router, Axios, TailwindCSS
- **Backend:** FastAPI, SQLAlchemy 2.x, Alembic, Pydantic v2, JWT (python-jose), Passlib/Bcrypt, Uvicorn
- **Database/Infra:** MySQL 8 (Docker Compose), Adminer

---

## Repository Structure
```text
.
├── backend/        # FastAPI API + SQLAlchemy models + Alembic migrations
├── frontend/       # Voter portal (React/Vite)
├── frontend-admin/ # Admin portal (React/Vite)
└── infra/          # Docker Compose (MySQL + Adminer)

---

## Prerequisites
Install:
- **Git**
- **Node.js (LTS)** + npm
- **Python 3.10+**
- **Docker Desktop** (or Docker Engine + docker compose)

Verify:
```bash
git --version
node -v
npm -v
python3 --version
docker --version
docker compose version
Download / Clone (SSH)
git clone git@github.com:DigdarshanB/online-voting-system.git
cd online-voting-system
Run the Project (Local Dev)
1) Start MySQL + Adminer (Docker)
docker compose -f infra/docker-compose.yml up -d

Adminer:

http://localhost:8080

(Use MySQL credentials from infra/docker-compose.yml)

2) Backend (FastAPI)
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8000

Swagger (API docs):

http://localhost:8000/docs

3) Voter Portal (React/Vite)
cd ../frontend
npm install
npm run dev

http://localhost:5173

4) Admin Portal (React/Vite)
cd ../frontend-admin
npm install
npm run dev

http://localhost:5174

Environment Variables (Frontend)

Both portals support a Vite API base URL.

Create frontend/.env and frontend-admin/.env (optional):

VITE_API_BASE_URL=http://localhost:8000
Database Migrations (Alembic)

From backend/ with venv active:

alembic upgrade head

Create a new migration:

alembic revision --autogenerate -m "your_message"

Rollback last migration:

alembic downgrade -1
Default Local Ports

Backend API: http://localhost:8000

Swagger: http://localhost:8000/docs

Voter UI: http://localhost:5173

Admin UI: http://localhost:5174

Adminer: http://localhost:8080
