import io
import uuid
import pandas as pd
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, status
from app.schemas.student import StudentCreate, StudentUpdate, StudentResponse, StudentAttendanceDetail
from app.services.supabase_client import get_supabase
from app.api.deps import get_current_user, verify_centre_access

router = APIRouter(prefix="/students", tags=["Students"])

@router.get("", response_model=List[StudentResponse])
async def list_students(
    centre_id: Optional[str] = None,
    batch_id: Optional[str] = None,
    course: Optional[str] = None,
    search: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    supabase = get_supabase()
    query = supabase.table("students").select("*")

    # Manager constraint
    if current_user.get("role") != "admin" and current_user.get("centre_id"):
        centre_id = current_user["centre_id"]

    if centre_id:
        query = query.eq("centre_id", centre_id)
    if batch_id:
        query = query.eq("batch_id", batch_id)
    if course:
        query = query.eq("course", course)

    students = query.execute().data

    # Fetch centres and batches for lookups
    centres = {c["id"]: c["name"] for c in supabase.table("training_centres").select("id, name").execute().data}
    batches = {b["id"]: b["batch_code"] for b in supabase.table("batches").select("id, batch_code").execute().data}

    # Fetch attendance stats per student
    att_records = supabase.table("attendance_records").select("student_id, status").execute().data
    att_stats = {}
    for r in att_records:
        sid = r["student_id"]
        if sid not in att_stats:
            att_stats[sid] = {"total": 0, "present": 0, "absent": 0}
        att_stats[sid]["total"] += 1
        if r["status"] == "present":
            att_stats[sid]["present"] += 1
        elif r["status"] == "absent":
            att_stats[sid]["absent"] += 1

    result = []
    for s in students:
        if search:
            q = search.lower()
            if q not in s["full_name"].lower() and q not in s["student_id"].lower() and q not in (s.get("email") or "").lower():
                continue

        st_copy = dict(s)
        st_copy["centre_name"] = centres.get(s["centre_id"], "Unknown")
        st_copy["batch_code"] = batches.get(s.get("batch_id"), "N/A")

        stats = att_stats.get(s["id"], {"total": 0, "present": 0, "absent": 0})
        st_copy["total_classes"] = stats["total"]
        st_copy["total_present"] = stats["present"]
        st_copy["total_absent"] = stats["absent"]
        st_copy["attendance_percentage"] = round((stats["present"] / stats["total"]) * 100, 1) if stats["total"] > 0 else 0.0

        result.append(StudentResponse(**st_copy))

    return result

@router.post("", response_model=StudentResponse, status_code=status.HTTP_201_CREATED)
async def create_student(
    student_in: StudentCreate,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    verify_centre_access(current_user, student_in.centre_id)
    supabase = get_supabase()

    # Check unique student ID
    existing = supabase.table("students").select("id").eq("student_id", student_in.student_id).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail=f"Student ID {student_in.student_id} already exists.")

    new_stu = student_in.model_dump()
    new_stu["id"] = str(uuid.uuid4())
    res = supabase.table("students").insert(new_stu).execute()
    created = res.data[0] if isinstance(res.data, list) else res.data
    return StudentResponse(**created)

@router.post("/import")
async def import_students(
    file: UploadFile = File(...),
    centre_id: str = Form(...),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    verify_centre_access(current_user, centre_id)
    content = await file.read()

    try:
        if file.filename.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(content))
        else:
            df = pd.read_excel(io.BytesIO(content))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Unable to read file: {e}")

    supabase = get_supabase()
    batches = {b["batch_code"]: b["id"] for b in supabase.table("batches").select("id, batch_code").eq("centre_id", centre_id).execute().data}

    imported = 0
    skipped = 0

    for _, row in df.iterrows():
        sid_code = str(row.get("Student ID") or row.get("student_id", "")).strip()
        name = str(row.get("Full Name") or row.get("full_name", "")).strip()
        course = str(row.get("Course") or row.get("course", "General")).strip()
        batch_code = str(row.get("Batch Code") or row.get("batch_code", "")).strip()

        if not sid_code or not name:
            skipped += 1
            continue

        existing = supabase.table("students").select("id").eq("student_id", sid_code).execute()
        if existing.data:
            skipped += 1
            continue

        rec = {
            "id": str(uuid.uuid4()),
            "student_id": sid_code,
            "full_name": name,
            "email": str(row.get("Email") or row.get("email", "")).strip() or None,
            "phone": str(row.get("Phone") or row.get("phone", "")).strip() or None,
            "course": course,
            "batch_id": batches.get(batch_code),
            "centre_id": centre_id,
            "status": "active"
        }
        supabase.table("students").insert(rec).execute()
        imported += 1

    return {"message": f"Successfully imported {imported} students. {skipped} skipped (duplicates/invalid)."}

@router.get("/{student_id}", response_model=StudentAttendanceDetail)
async def get_student(
    student_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    supabase = get_supabase()
    res = supabase.table("students").select("*").eq("id", student_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Student not found.")
    student = res.data[0]
    verify_centre_access(current_user, student["centre_id"])

    # Attendance history
    att_history = supabase.table("attendance_records").select("*").eq("student_id", student_id).order("date", desc=True).execute().data

    total = len(att_history)
    present = sum(1 for r in att_history if r["status"] == "present")
    absent = sum(1 for r in att_history if r["status"] == "absent")

    st_copy = dict(student)
    st_copy["attendance_history"] = att_history
    st_copy["total_classes"] = total
    st_copy["total_present"] = present
    st_copy["total_absent"] = absent
    st_copy["attendance_percentage"] = round((present / total) * 100, 1) if total > 0 else 0.0

    return StudentAttendanceDetail(**st_copy)

@router.put("/{student_id}", response_model=StudentResponse)
async def update_student(
    student_id: str,
    student_in: StudentUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    supabase = get_supabase()
    res = supabase.table("students").select("centre_id").eq("id", student_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Student not found.")
    verify_centre_access(current_user, res.data[0]["centre_id"])

    update_data = {k: v for k, v in student_in.model_dump().items() if v is not None}
    updated = supabase.table("students").update(update_data).eq("id", student_id).execute()
    return StudentResponse(**updated.data[0])

@router.delete("/{student_id}")
async def delete_student(
    student_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    supabase = get_supabase()
    res = supabase.table("students").select("centre_id").eq("id", student_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Student not found.")
    verify_centre_access(current_user, res.data[0]["centre_id"])

    supabase.table("students").delete().eq("id", student_id).execute()
    return {"message": "Student successfully removed."}
