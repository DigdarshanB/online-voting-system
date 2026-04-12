from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.routes.auth import router as auth_router
from app.routes.admin import router as admin_router
from app.routes.admin_dashboard import router as admin_dashboard_router
from app.routes.admin_dashboard_analytics import router as admin_dashboard_analytics_router
from app.routes.admin_elections import router as admin_elections_router
from app.routes.admin_parties import router as admin_parties_router
from app.routes.admin_candidates import router as admin_candidates_router
from app.routes.verification import router as verification_router
from app.routes.registration import router as registration_router
from app.routes.admin_verifications import router as admin_verifications_router
from app.routes.admin_voter_verifications import router as admin_voter_verifications_router
from app.routes.voter_elections import router as voter_elections_router
from app.routes.admin_results import router as admin_results_router
from app.routes.voter_results import router as voter_results_router
from app.routes.admin_voter_assignments import router as admin_voter_assignments_router
from app.routes.admin_voter_area_assignments import router as admin_voter_area_assignments_router
from app.routes.admin_audit import router as admin_audit_router

app = FastAPI(title="Online Voting System API")

# DEV CORS (allow Vite ports)
origins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def add_security_headers(request, call_next):
    """Inject strict security headers across all API responses."""
    response = await call_next(request)
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data: https:; "
        "connect-src 'self' http://localhost:* ws://localhost:*;"
    )
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    return response

app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(admin_dashboard_router)
app.include_router(admin_dashboard_analytics_router)
app.include_router(admin_elections_router)
app.include_router(admin_parties_router)
app.include_router(admin_candidates_router)
app.include_router(verification_router)
app.include_router(registration_router)
app.include_router(admin_verifications_router)
app.include_router(admin_voter_verifications_router)
app.include_router(voter_elections_router)
app.include_router(admin_results_router)
app.include_router(voter_results_router)
app.include_router(admin_voter_assignments_router)
app.include_router(admin_voter_area_assignments_router)
app.include_router(admin_audit_router)

# Mount uploads directory for serving party symbols and candidate photos
_uploads_dir = Path(__file__).resolve().parents[1] / "uploads"
_uploads_dir.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(_uploads_dir)), name="uploads")

@app.get("/health")
def health():
    return {"status": "ok"}

