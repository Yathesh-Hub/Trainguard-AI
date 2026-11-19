import os
import uuid
from typing import Optional, Dict, Any
from fastapi import UploadFile, HTTPException
from app.core.config import settings
from app.services.supabase_client import get_supabase

# Maximum file sizes (in bytes)
MAX_ATTENDANCE_SIZE = 15 * 1024 * 1024 # 15 MB
MAX_IMAGE_SIZE = 10 * 1024 * 1024       # 10 MB
MAX_REPORT_SIZE = 20 * 1024 * 1024      # 20 MB

ALLOWED_ATTENDANCE_EXTENSIONS = {".csv", ".xlsx", ".xls"}
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
ALLOWED_REPORT_EXTENSIONS = {".pdf"}

class StorageService:
    @staticmethod
    def validate_file(file: UploadFile, category: str, content_length: Optional[int] = None):
        ext = os.path.splitext(file.filename)[1].lower()

        if category == "attendance":
            if ext not in ALLOWED_ATTENDANCE_EXTENSIONS:
                raise HTTPException(status_code=400, detail=f"Invalid file type {ext}. Supported formats: .csv, .xlsx, .xls")
            if content_length and content_length > MAX_ATTENDANCE_SIZE:
                raise HTTPException(status_code=400, detail="Attendance file exceeds 15MB limit.")
        elif category == "infrastructure":
            if ext not in ALLOWED_IMAGE_EXTENSIONS:
                raise HTTPException(status_code=400, detail=f"Invalid image type {ext}. Supported formats: .jpg, .jpeg, .png, .webp")
            if content_length and content_length > MAX_IMAGE_SIZE:
                raise HTTPException(status_code=400, detail="Image file exceeds 10MB limit.")
        elif category == "report":
            if ext not in ALLOWED_REPORT_EXTENSIONS:
                raise HTTPException(status_code=400, detail="Report must be a PDF document.")
            if content_length and content_length > MAX_REPORT_SIZE:
                raise HTTPException(status_code=400, detail="Report exceeds 20MB limit.")

    @classmethod
    async def upload_file(
        cls,
        file: UploadFile,
        centre_id: str,
        category: str,
        uploaded_by_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Validates, uploads to appropriate Supabase Storage bucket,
        and saves file metadata in uploaded_documents table.
        """
        content = await file.read()
        file_size = len(content)

        cls.validate_file(file, category, file_size)

        supabase = get_supabase()
        ext = os.path.splitext(file.filename)[1].lower()
        unique_name = f"{uuid.uuid4().hex}{ext}"

        if category == "attendance":
            bucket_name = settings.STORAGE_BUCKET_ATTENDANCE
        elif category == "infrastructure":
            bucket_name = settings.STORAGE_BUCKET_INFRASTRUCTURE
        else:
            bucket_name = settings.STORAGE_BUCKET_REPORTS

        storage_path = f"{centre_id}/{unique_name}"

        # Upload to Supabase Storage
        try:
            supabase.storage.from_(bucket_name).upload(
                storage_path,
                content,
                {"content-type": file.content_type}
            )
        except Exception as e:
            # Fallback local storage write if storage API error
            local_bucket_dir = settings.UPLOAD_DIR / bucket_name / centre_id
            local_bucket_dir.mkdir(parents=True, exist_ok=True)
            with open(local_bucket_dir / unique_name, "wb") as f:
                f.write(content)

        # Generate a signed URL
        signed_url_info = cls.get_signed_url(bucket_name, storage_path, expires_in=3600)
        signed_url = signed_url_info.get("signedURL", f"/api/storage/{bucket_name}/{storage_path}")

        # Insert metadata into uploaded_documents table
        doc_record = {
            "id": str(uuid.uuid4()),
            "centre_id": centre_id,
            "uploaded_by": uploaded_by_id,
            "file_name": file.filename,
            "file_type": file.content_type or ext,
            "file_size_bytes": file_size,
            "storage_bucket": bucket_name,
            "storage_path": storage_path,
            "document_category": category,
            "processing_status": "completed",
            "meta_info": {
                "original_filename": file.filename,
                "signed_url": signed_url
            }
        }
        supabase.table("uploaded_documents").insert(doc_record).execute()

        return {
            "document_id": doc_record["id"],
            "file_name": file.filename,
            "file_size": file_size,
            "bucket": bucket_name,
            "storage_path": storage_path,
            "signed_url": signed_url,
            "raw_content": content
        }

    @staticmethod
    def get_signed_url(bucket_name: str, storage_path: str, expires_in: int = 3600) -> Dict[str, str]:
        supabase = get_supabase()
        try:
            res = supabase.storage.from_(bucket_name).create_signed_url(storage_path, expires_in)
            if isinstance(res, dict) and "signedURL" in res:
                return res
            elif hasattr(res, "signed_url"):
                return {"signedURL": res.signed_url}
        except Exception:
            pass
        return {"signedURL": f"/api/storage/{bucket_name}/{storage_path}"}
