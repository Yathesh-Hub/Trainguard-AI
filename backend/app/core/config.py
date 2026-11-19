from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import List, Union
import os
import json
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent

class Settings(BaseSettings):
    PROJECT_NAME: str = "TrainGuard AI"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    
    # Supabase Credentials
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    SUPABASE_ANON_KEY: str = os.getenv("SUPABASE_ANON_KEY", "")
    SUPABASE_JWT_SECRET: str = os.getenv("SUPABASE_JWT_SECRET", "super-secret-jwt-key-trainguard-ai-min32char")
    
    # Server configuration
    PORT: int = 8001
    HOST: str = "0.0.0.0"
    BACKEND_PORT: int = 8001
    CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ]
    
    # Storage Buckets
    STORAGE_BUCKET_ATTENDANCE: str = "attendance-files"
    STORAGE_BUCKET_INFRASTRUCTURE: str = "infrastructure-images"
    STORAGE_BUCKET_REPORTS: str = "reports"
    
    ALLOW_LOCAL_FALLBACK: bool = True
    
    UPLOAD_DIR: Path = BASE_DIR / "uploads"
    REPORTS_DIR: Path = BASE_DIR / "reports"

    @field_validator("CORS_ORIGINS", mode="before")
    def parse_cors(cls, v):
        if isinstance(v, str):
            if v.startswith("[") and v.endswith("]"):
                try:
                    return json.loads(v)
                except Exception:
                    pass
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()

settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
settings.REPORTS_DIR.mkdir(parents=True, exist_ok=True)
