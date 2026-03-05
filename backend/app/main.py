from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.auth import router as auth_router
from app.routes.admin import router as admin_router
from app.routes.verification import router as verification_router
from app.routes.admin_verifications import router as admin_verifications_router

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

app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(verification_router)
app.include_router(admin_verifications_router)

@app.get("/health")
def health():
    return {"status": "ok"}
