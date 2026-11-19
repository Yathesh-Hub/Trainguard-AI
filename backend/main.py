import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api import auth, centres, students, trainers, attendance, infrastructure, anomalies, compliance, reports, storage

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("trainguard.main")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="TrainGuard AI - AI-Based Training Centre Attendance and Infrastructure Compliance Monitoring API"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(centres.router, prefix=settings.API_V1_STR)
app.include_router(students.router, prefix=settings.API_V1_STR)
app.include_router(trainers.router, prefix=settings.API_V1_STR)
app.include_router(attendance.router, prefix=settings.API_V1_STR)
app.include_router(infrastructure.router, prefix=settings.API_V1_STR)
app.include_router(anomalies.router, prefix=settings.API_V1_STR)
app.include_router(compliance.router, prefix=settings.API_V1_STR)
app.include_router(reports.router, prefix=settings.API_V1_STR)
app.include_router(storage.router, prefix=settings.API_V1_STR)

@app.get("/")
async def root():
    return {
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "online",
        "documentation": "/docs",
        "supabase_connected": bool(settings.SUPABASE_URL and not settings.SUPABASE_URL.startswith("https://xyzcompany"))
    }

@app.get("/api/health")
async def health_check():
    from app.services.supabase_client import get_supabase
    client = get_supabase()
    return {
        "status": "healthy",
        "database_backend": "Supabase PostgreSQL",
        "mode": "live_supabase" if hasattr(client, "postgrest") else "local_managed_provider",
        "storage_buckets": [
            settings.STORAGE_BUCKET_ATTENDANCE,
            settings.STORAGE_BUCKET_INFRASTRUCTURE,
            settings.STORAGE_BUCKET_REPORTS
        ]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=settings.HOST, port=settings.PORT, reload=True)
