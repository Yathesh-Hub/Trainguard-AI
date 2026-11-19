import uuid
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, status
from app.schemas.centre import CentreCreate, CentreUpdate, CentreResponse, CentreDetailResponse
from app.services.supabase_client import get_supabase
from app.api.deps import get_current_user, get_current_admin, verify_centre_access

router = APIRouter(prefix="/centres", tags=["Training Centres"])

@router.get("", response_model=List[CentreResponse])
async def list_centres(
    search: Optional[str] = None,
    status_filter: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    supabase = get_supabase()
    query = supabase.table("training_centres").select("*")

    # Centre manager restriction
    if current_user.get("role") != "admin" and current_user.get("centre_id"):
        query = query.eq("id", current_user["centre_id"])

    if status_filter:
        query = query.eq("status", status_filter)

    centres = query.execute().data

    # Enrich with counts and stats
    students = supabase.table("students").select("id, centre_id").execute().data
    trainers = supabase.table("trainers").select("id, assigned_centre_id").execute().data
    scores = supabase.table("compliance_scores").select("centre_id, overall_score").execute().data

    stu_counts = {}
    for s in students:
        cid = s.get("centre_id")
        stu_counts[cid] = stu_counts.get(cid, 0) + 1

    trn_counts = {}
    for t in trainers:
        cid = t.get("assigned_centre_id")
        trn_counts[cid] = trn_counts.get(cid, 0) + 1

    score_map = {}
    for sc in scores:
        cid = sc.get("centre_id")
        score_map[cid] = sc.get("overall_score", 0.0)

    result = []
    for c in centres:
        if search:
            query_str = search.lower()
            if query_str not in c["name"].lower() and query_str not in c["centre_code"].lower() and query_str not in c["district"].lower():
                continue

        c_copy = dict(c)
        c_copy["total_students"] = stu_counts.get(c["id"], 0)
        c_copy["total_trainers"] = trn_counts.get(c["id"], 0)
        c_copy["latest_compliance_score"] = score_map.get(c["id"], 85.0)
        c_copy["average_attendance"] = 86.5
        result.append(CentreResponse(**c_copy))

    return result

@router.post("", response_model=CentreResponse, status_code=status.HTTP_201_CREATED)
async def create_centre(
    centre_in: CentreCreate,
    admin_user: Dict[str, Any] = Depends(get_current_admin)
):
    supabase = get_supabase()

    # Check unique code
    existing = supabase.table("training_centres").select("id").eq("centre_code", centre_in.centre_code).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="Centre code already exists.")

    new_centre = centre_in.model_dump()
    new_centre["id"] = str(uuid.uuid4())
    res = supabase.table("training_centres").insert(new_centre).execute()
    created = res.data[0] if isinstance(res.data, list) else res.data
    return CentreResponse(**created)

@router.get("/{centre_id}", response_model=CentreDetailResponse)
async def get_centre(
    centre_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    verify_centre_access(current_user, centre_id)
    supabase = get_supabase()

    res = supabase.table("training_centres").select("*").eq("id", centre_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Training centre not found.")
    centre = res.data[0]

    # Batches
    batches = supabase.table("batches").select("*").eq("centre_id", centre_id).execute().data
    trainers = supabase.table("trainers").select("*").eq("assigned_centre_id", centre_id).execute().data
    anomalies = supabase.table("anomaly_records").select("id").eq("centre_id", centre_id).eq("review_status", "open").execute().data

    detail = dict(centre)
    detail["batches"] = batches
    detail["trainers"] = trainers
    detail["active_anomalies_count"] = len(anomalies)
    detail["total_students"] = len(supabase.table("students").select("id").eq("centre_id", centre_id).execute().data)
    detail["total_trainers"] = len(trainers)

    score_res = supabase.table("compliance_scores").select("overall_score").eq("centre_id", centre_id).order("calculation_date", desc=True).limit(1).execute()
    detail["latest_compliance_score"] = score_res.data[0]["overall_score"] if score_res.data else 85.0

    return CentreDetailResponse(**detail)

@router.put("/{centre_id}", response_model=CentreResponse)
async def update_centre(
    centre_id: str,
    centre_in: CentreUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    verify_centre_access(current_user, centre_id)
    supabase = get_supabase()

    update_data = {k: v for k, v in centre_in.model_dump().items() if v is not None}
    res = supabase.table("training_centres").update(update_data).eq("id", centre_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Training centre not found.")

    return CentreResponse(**res.data[0])

@router.delete("/{centre_id}")
async def delete_centre(
    centre_id: str,
    admin_user: Dict[str, Any] = Depends(get_current_admin)
):
    supabase = get_supabase()
    res = supabase.table("training_centres").delete().eq("id", centre_id).execute()
    return {"message": "Centre successfully removed."}
