from datetime import datetime, timedelta
from jose import jwt
from app.core.config import settings

def create_access_token(subject: str, role: str) -> str:
    now = datetime.utcnow()
    exp = now + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    payload = {"sub": subject, "role": role, "iat": int(now.timestamp()), "exp": int(exp.timestamp())}
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
