import os
from typing import Optional
from fastapi import APIRouter, HTTPException, Query, Response
from fastapi.responses import FileResponse
from app.core.config import settings

router = APIRouter(prefix="/storage", tags=["Storage Access"])

@router.get("/{bucket_name}/{file_path:path}")
async def get_storage_file(bucket_name: str, file_path: str, expires: Optional[int] = Query(None)):
    target = settings.UPLOAD_DIR / bucket_name / file_path.replace("/", os.sep)
    if not target.exists():
        # Check if dummy image or sample exists
        raise HTTPException(status_code=404, detail="File not found in storage bucket.")

    # Determine media type
    ext = target.suffix.lower()
    media_map = {
        ".pdf": "application/pdf",
        ".csv": "text/csv",
        ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp"
    }
    media_type = media_map.get(ext, "application/octet-stream")
    return FileResponse(path=str(target), media_type=media_type)
