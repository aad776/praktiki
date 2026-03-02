import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    PROJECT_NAME: str = "ABC Credits Internship Portal"
    PROJECT_VERSION: str = "1.0.0"
    
    SECRET_KEY: str = os.getenv("SECRET_KEY", os.getenv("JWT_SECRET", "MAIN_GAREEB_HUN"))
    print(f"DEBUG: ABC Portal SECRET_KEY loaded from env: {SECRET_KEY == os.getenv('SECRET_KEY', 'MAIN_GAREEB_HUN')}")
    ALGORITHM: str = os.getenv("JWT_ALGO", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))
    
    # Use the same database as main portal for integration
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///../PythonProject/test.db")

settings = Settings()
