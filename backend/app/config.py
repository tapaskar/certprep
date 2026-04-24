from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# Resolve .env relative to this file, not the calling process's CWD.
# This means `python -m app.cli` works from any directory.
_ENV_FILE = Path(__file__).parent.parent / ".env"


class Settings(BaseSettings):
    # App
    app_name: str = "SparkUpCloud API"
    debug: bool = False
    api_version: str = "v1"

    # Database
    database_url: str = "postgresql+asyncpg://certprep:certprep@localhost:5432/certprep"
    database_echo: bool = False

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # Auth (Clerk - legacy)
    clerk_secret_key: str = ""
    clerk_webhook_secret: str = ""
    clerk_issuer: str = ""

    # JWT
    jwt_secret_key: str = "certprep-jwt-secret-change-in-production"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 1440  # 24 hours

    # Email (AWS SES)
    ses_sender_email: str = "admin@sparkupcloud.com"
    ses_region: str = "ap-south-1"

    # Stripe
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""

    # ── LLM provider selection ────────────────────────────────
    # "anthropic" (default), "bedrock" (Claude via AWS), or "local" (llama.cpp)
    llm_provider: str = "anthropic"

    # Anthropic Claude API direct
    anthropic_api_key: str = ""
    ai_model: str = "claude-sonnet-4-20250514"
    # Cheaper "fast" variant — used by agentic /observe judgments
    # where Sonnet is overkill. ~12x cheaper than Sonnet.
    ai_model_fast: str = "claude-3-5-haiku-20241022"
    ai_max_tokens: int = 300
    ai_temperature: float = 0.3
    ai_timeout_seconds: int = 10
    ai_per_user_per_hour: int = 20
    ai_per_user_per_day: int = 100
    ai_budget_monthly_usd: float = 500.0

    # Amazon Bedrock (when llm_provider == "bedrock")
    bedrock_region: str = "ap-south-1"
    bedrock_model: str = "anthropic.claude-sonnet-4-20250514-v1:0"
    bedrock_model_fast: str = "anthropic.claude-3-5-haiku-20241022-v1:0"

    # Local llama.cpp (when llm_provider == "local")
    local_llm_url: str = "http://127.0.0.1:8080"
    local_llm_model: str = "qwen2.5-7b-instruct-q4_k_m"
    local_llm_timeout_seconds: float = 120.0

    # CORS
    cors_origins: list[str] = [
        "http://localhost:3000",
        "https://sparkupcloud.com",
        "https://www.sparkupcloud.com",
    ]

    model_config = SettingsConfigDict(
        env_file=str(_ENV_FILE),
        env_file_encoding="utf-8",
        # Never raise on a missing .env file — fall back to defaults + env vars
        env_ignore_empty=True,
        extra="ignore",
    )


settings = Settings()
