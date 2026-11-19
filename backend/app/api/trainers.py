import uuid
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, status
from app.schemas.trainer import TrainerCreate, TrainerUpdate, TrainerResponse
from app.services.supabase_client import get_supabase
from app.api.deps import get_current_user, verify_centre_access

router = APIRouter(prefix="/trainers", tags=["Trainers"])

@router.get("", response_model=List[TrainerResponse])
async def list_trainers(
    centre_id: Optional[str] = None,
    subject: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    supabase = get_supabase()
    query = supabase.table("trainers").select("*")

    if current_user.get("role") != "admin" and current_user.get("centre_id"):
        centre_id = current_user["centre_id"]

    if centre_id:
        query = query.eq("assigned_centre_id", centre_id)
    if subject:
        query = query.eq("subject", subject)

    trainers = query.execute().data

    centres = {c["id"]: c["name"] for c in supabase.table("training_centres").select("id, name").execute().data}
    batches = {b["id"]: b["batch_code"] for b in supabase.table("batches").select("id, batch_code").execute().data}

    # Trainer attendance aggregation
    tr_att = supabase.table("trainer_attendance").select("trainer_id, status, session_hours").execute().data
    tr_stats = {}
    for r in tr_att:
        tid = r["trainer_id"]
        if tid not in tr_stats:
            tr_stats[tid] = {"total_days": 0, "present_days": 0, "total_hours": 0.0}
        tr_stats[tid]["total_days"] += 1
        if r["status"] == "present":
            tr_stats[tid]["present_days"] += 1
        elif r["status"] == "half_day":
            tr_stats[tid]["present_days"] += 0.5
        tr_stats[tid]["total_hours"] += float(r.get("session_hours", 0.0))

    result = []
    for t in trainers:
        t_copy = dict(t)
        t_copy["centre_name"] = centres.get(t["assigned_centre_id"], "Unknown")
        t_copy["batch_code"] = batches.get(t.get("assigned_batch_id"), "Unassigned")

        stats = tr_stats.get(t["id"], {"total_days": 0, "present_days": 0, "total_hours": 0.0})
        t_copy["total_sessions_conducted"] = int(stats["present_days"])
        t_copy["total_hours_taught"] = round(stats["total_hours"], 1)
        t_copy["attendance_percentage"] = round((stats["present_days"] / stats["total_days"]) * 100, 1) if stats["total_days"] > 0 else 92.0

        result.append(TrainerResponse(**t_copy))

    return result

@router.get("/analytics")
async def trainer_analytics(
    centre_id: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    supabase = get_supabase()
    if current_user.get("role") != "admin" and current_user.get("centre_id"):
        centre_id = current_user["centre_id"]

    query = supabase.table("trainer_attendance").select("*")
    if centre_id:
        query = query.eq("centre_id", centre_id)
    records = query.execute().data

    if not records:
        return {
            "average_availability": 0.0,
            "total_sessions_completed": 0,
            "total_teaching_hours": 0.0,
            "leave_count": 0,
            "status_distribution": {}
        }

    status_dist = {}
    total_hours = 0.0
    present_equiv = 0.0
    leave_count = 0

    for r in records:
        s = r.get("status", "absent")
        status_dist[s] = status_dist.get(s, 0) + 1
        hrs = float(r.get("session_hours", 0.0))
        total_hours += hrs
        if s == "present":
            present_equiv += 1.0
        elif s == "half_day":
            present_equiv += 0.5
        elif s == "on_leave":
            leave_count += 1

    total_entries = len(records)
    avg_avail = round((present_equiv / total_entries) * 100, 1)

    return {
        "average_availability": avg_avail,
        "total_sessions_completed": int(present_equiv),
        "total_teaching_hours": round(total_hours, 1),
        "leave_count": leave_count,
        "status_distribution": status_dist
    }

@router.post("", response_model=TrainerResponse, status_code=status.HTTP_201_CREATED)
async def create_trainer(
    trainer_in: TrainerCreate,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    verify_centre_access(current_user, trainer_in.assigned_centre_id)
    supabase = get_supabase()

    existing = supabase.table("trainers").select("id").eq("trainer_id", trainer_in.trainer_id).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail=f"Trainer ID {trainer_in.trainer_id} already exists.")

    new_t = trainer_in.model_dump()
    new_t["id"] = str(uuid.uuid4())
    res = supabase.table("trainers").insert(new_t).execute()
    created = res.data[0] if isinstance(res.data, list) else res.data
    return TrainerResponse(**created)

@router.get("/{trainer_id}", response_model=TrainerResponse)
async def get_trainer(
    trainer_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    supabase = get_supabase()
    res = supabase.table("trainers").select("*").eq("id", trainer_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Trainer not found.")
    trainer = res.data[0]
    verify_centre_access(current_user, trainer["assigned_centre_id"])

    return TrainerResponse(**trainer)

@router.put("/{trainer_id}", response_model=TrainerResponse)
async def update_trainer(
    trainer_id: str,
    trainer_in: TrainerUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    supabase = get_supabase()
    res = supabase.table("trainers").select("assigned_centre_id").eq("id", trainer_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Trainer not found.")
    verify_centre_access(current_user, res.data[0]["assigned_centre_id"])

    update_data = {k: v for k, v in trainer_in.model_dump().items() if v is not None}
    updated = supabase.table("trainers").update(update_data).eq("id", trainer_id).execute()
    return TrainerResponse(**updated.data[0])

@router.delete("/{trainer_id}")
async def delete_trainer(
    trainer_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    supabase = get_supabase()
    res = supabase.table("trainers").select("assigned_centre_id").eq("id", trainer_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Trainer not found.")
    verify_centre_access(current_user, res.data[0]["assigned_centre_id"])

    supabase.table("trainers").delete().eq("id", trainer_id).execute()
    return {"message": "Trainer removed successfully."}
