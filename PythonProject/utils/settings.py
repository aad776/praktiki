from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    APP_ENV: str = "development"
    DATABASE_URL: str
    JWT_SECRET: str
    JWT_ALGO: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours for development
    
    # SMTP Settings
    SMTP_SERVER: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USERNAME: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SENDER_EMAIL: str = "noreply@praktiki.com"

    # Google OAuth
    GOOGLE_CLIENT_ID: Optional[str] = None
    
    # OpenAI
    OPENAI_API_KEY: Optional[str] = None

    # Resume Parser Service (external microservice)
    PARSER_SERVICE_URL: str = "http://127.0.0.1:8002"
    PARSER_SERVICE_TIMEOUT_SECONDS: int = 45
    PARSER_SERVICE_API_KEY: Optional[str] = None

    # Optional settings for future use
    REDIS_URL: Optional[str] = None
    AWS_S3_BUCKET: Optional[str] = None
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None

    # Certificate Verification Service URL
    CERT_VERIFICATION_URL: str = "http://localhost:8003/api/certificates/upload"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
