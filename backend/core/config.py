import os
from dotenv import load_dotenv

load_dotenv()


def get_env(name: str, default=None, required: bool = False, cast_type=None):
    raw_value = os.getenv(name)

    if raw_value is None:
        if required:
            raise RuntimeError(f"❌ Missing required environment variable: {name}")

        if default is not None:
            print(f"⚠️ ENV NOT SET → {name} (using default: {default})")
            value = default
        else:
            value = None
    else:
        value = raw_value

    if cast_type and value is not None:
        try:
            value = cast_type(value)
        except Exception:
            raise RuntimeError(f"❌ Failed to cast env variable {name} to {cast_type}")

    return value


class Settings:

    # CORE
    PYTHON_ENV = get_env("PYTHON_ENV", "production")
    environment = PYTHON_ENV
    PYTHON_WORKER = get_env("PYTHON_WORKER")
    SERVER_REQUEST_TIMEOUT = "900"
    HOST = get_env("HOST", "0.0.0.0")
    PORT = get_env("PORT", "8000")
    PYTHON_WORKER = get_env("PYTHON_WORKER", "2")
    PYTHONPATH = get_env("PYTHONPATH", ".")
    SECRET_KEY = get_env("SECRET_KEY")
    LOG_LEVEL = get_env("LOG_LEVEL")
    APP = get_env("APP")

    # DATABASE
    DATABASE_URL = get_env(
        "DATABASE_URL",
        "DATABASE_URL....",
    )

    # LLM
    OPENAI_API_KEY = get_env("OPENAI_API_KEY", "sk-...your-key-here...")
    openai_api_key = OPENAI_API_KEY

    # ML
    ML_MODEL_PATH = get_env("ML_MODEL_PATH", "ml/models/lead_scorer.joblib")

    # LMS
    STATIC_DIR = get_env("STATIC_DIR", "static")
    CERT_STORAGE_PATH = get_env("CERT_STORAGE_PATH", "static/certificates")
    BADGE_STORAGE_PATH = get_env("BADGE_STORAGE_PATH", "static/badges")

    # REDIS
    REDIS_URL = get_env("REDIS_URL", "redis://localhost:6379/0")
    redis_url = REDIS_URL

    # CORS
    ALLOWED_ORIGINS = get_env("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:3001,http://localhost:3002")

    @property
    def origins_list(self) -> list[str]:
        if not self.ALLOWED_ORIGINS or self.ALLOWED_ORIGINS == "*":
            return ["*"]
        return [s.strip() for s in self.ALLOWED_ORIGINS.split(",")]

    # SCHEDULER
    SCHEDULER_ENABLED = get_env("SCHEDULER_ENABLED", True, cast_type=bool)

    # CELERY
    CELERY_BROKER_URL = get_env("CELERY_BROKER_URL", "redis://localhost:6379/0")
    CELERY_RESULT_BACKEND = get_env("CELERY_RESULT_BACKEND", "redis://localhost:6379/0")


def get_settings() -> Settings:
    return Settings()


settings = get_settings()
