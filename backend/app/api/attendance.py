from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, Query
from app.schemas.attendance import AttendanceUploadResponse, AttendanceAnalyticsResponse
from app.services.attendance_service import attendance_service
from app.services.storage_service import StorageService
from app.services.supabase_client import get_supabase
from app.api.deps import get_current_user, verify_centre_access

router = APIRouter(prefix="/attendance", tags=["Attendance"])

@router.post("/upload", response_model=AttendanceUploadResponse)
async def upload_attendance(
    file: UploadFile = File(...),
    centre_id: str = Form(...),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    verify_centre_access(current_user, centre_id)

    # 1. Upload to Supabase Storage
    storage_res = await StorageService.upload_file(
        file=file,
        centre_id=centre_id,
        category="attendance",
        uploaded_by_id=current_user.get("id")
    )

    # 2. Process data with attendance service
    result = await attendance_service.process_attendance_file(
        file_content=storage_res["raw_content"],
        filename=file.filename,
        centre_id=centre_id,
        uploaded_doc_id=storage_res["document_id"]
    )

    return AttendanceUploadResponse(**result)

@router.get("", response_model=List[Dict[str, Any]])
async def get_attendance(
    centre_id: Optional[str] = None,
    batch_id: Optional[str] = None,
    student_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    supabase = get_supabase()
    if current_user.get("role") != "admin" and current_user.get("centre_id"):
        centre_id = current_user["centre_id"]

    query = supabase.table("attendance_records").select("*")
    if centre_id:
        query = query.eq("centre_id", centre_id)
    if batch_id:
        query = query.eq("batch_id", batch_id)
    if student_id:
        query = query.eq("student_id", student_id)
    if start_date:
        query = query.gte("date", start_date)
    if end_date:
        query = query.lte("date", end_date)

    records = query.order("date", desc=True).range(offset, offset + limit - 1).execute().data

    # Enrich with student details
    students = {s["id"]: s for s in supabase.table("students").select("id, student_id, full_name").execute().data}
    centres = {c["id"]: c["name"] for c in supabase.table("training_centres").select("id, name").execute().data}

    for r in records:
        stu = students.get(r.get("student_id"), {})
        r["student_code"] = stu.get("student_id", "N/A")
        r["student_name"] = stu.get("full_name", "N/A")
        r["centre_name"] = centres.get(r.get("centre_id"), "N/A")

    return records

@router.get("/analytics", response_model=AttendanceAnalyticsResponse)
async def get_attendance_analytics(
    centre_id: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    if current_user.get("role") != "admin" and current_user.get("centre_id"):
        centre_id = current_user["centre_id"]

    analytics = attendance_service.get_attendance_analytics(centre_id)
    return AttendanceAnalyticsResponse(**analytics)

@router.get("/student/{student_id}")
async def get_student_attendance(
    student_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    supabase = get_supabase()
    stu = supabase.table("students").select("*").eq("id", student_id).execute().data
    if not stu:
        raise HTTPException(status_code=404, detail="Student not found.")
    verify_centre_access(current_user, stu[0]["centre_id"])

    records = supabase.table("attendance_records").select("*").eq("student_id", student_id).order("date", desc=True).execute().data
    return {
        "student": stu[0],
        "records": records,
        "total": len(records),
        "present": sum(1 for r in records if r["status"] == "present")
    }
