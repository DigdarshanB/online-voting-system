from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60

    # Admin-portal base URL used to build invite activation links.
    ADMIN_FRONTEND_URL: str = "http://localhost:5174"

    # Voter-portal base URL used to build voter verification links.
    VOTER_FRONTEND_URL: str = "http://localhost:5173"

    # SMTP config for transactional email delivery.
    SMTP_HOST: str | None = None
    SMTP_PORT: int = 587
    SMTP_USERNAME: str | None = None
    SMTP_PASSWORD: str | None = None
    SMTP_USE_TLS: bool = True
    SMTP_USE_SSL: bool = False
    SMTP_FROM_EMAIL: str | None = None
    SMTP_FROM_NAME: str = "Online Voting System"

    # Token / code TTLs (minutes)
    EMAIL_VERIFICATION_TTL_MINUTES: int = 15
    PASSWORD_RESET_TTL_MINUTES: int = 15

    # Runtime environment tag (used to gate dev-only helpers)
    ENVIRONMENT: str = "development"

    # Development-only helpers
    EMAIL_DEV_FALLBACK: bool = True
    EMAIL_DEV_FALLBACK_EXPOSE_TOKEN: bool = True

    # AES-256 key for encrypting ballot choices (hex-encoded 32 bytes = 64 hex chars).
    # MUST be overridden with a securely-generated key in production.
    BALLOT_ENCRYPTION_KEY: str = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"

    # ── AWS Rekognition Face Liveness ────────────────────────────
    AWS_REGION: str = "us-east-1"
    AWS_ACCESS_KEY_ID: str | None = None
    AWS_SECRET_ACCESS_KEY: str | None = None
    AWS_FACE_LIVENESS_ROLE_ARN: str | None = None

    # Face verification thresholds
    FACE_LIVENESS_CONFIDENCE_THRESHOLD: float = 90.0
    FACE_MATCH_CONFIDENCE_THRESHOLD: float = 90.0
    FACE_VERIFICATION_TOKEN_TTL_SECONDS: int = 300          # 5 minutes
    FACE_VERIFY_MAX_FAILURES: int = 5
    FACE_VERIFY_LOCK_DURATION_MINUTES: int = 15
    FACE_VERIFY_OBSERVATION_WINDOW_MINUTES: int = 30

    @model_validator(mode="after")
    def _strip_and_validate(cls, values: "Settings") -> "Settings":
        # Strip incidental whitespace from string settings to avoid subtle auth failures.
        for field in [
            "SMTP_HOST",
            "SMTP_USERNAME",
            "SMTP_PASSWORD",
            "SMTP_FROM_EMAIL",
            "SMTP_FROM_NAME",
            "ADMIN_FRONTEND_URL",
            "VOTER_FRONTEND_URL",
        ]:
            val = getattr(values, field, None)
            if isinstance(val, str):
                setattr(values, field, val.strip())

        if values.SMTP_USE_TLS and values.SMTP_USE_SSL:
            raise ValueError("SMTP_USE_TLS and SMTP_USE_SSL cannot both be true")

        return values

settings = Settings()
