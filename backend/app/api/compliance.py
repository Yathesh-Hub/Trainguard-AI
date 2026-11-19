from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends
from app.schemas.compliance import ComplianceScoreResponse, ComplianceOverviewResponse, ComplianceRecalculateRequest
from app.services.compliance_service import compliance_service
from app.services.supabase_client import get_supabase
from app.api.deps import get_current_user, get_current_admin

router = APIRouter(prefix="/compliance", tags=["Compliance Engine"])

@router.get("/overview", response_model=ComplianceOverviewResponse)
async def get_compliance_overview(current_user: Dict[str, Any] = Depends(get_current_user)):
    supabase = get_supabase()
    scores = supabase.table("compliance_scores").select("*").order("calculation_date", desc=True).execute().data
    centres = {c["id"]: c["name"] for c in supabase.table("training_centres").select("id, name").execute().data}

    # Dedup by latest centre score
    latest_by_centre = {}
    for s in scores:
        cid = s["centre_id"]
        if cid not in latest_by_centre:
            s_copy = dict(s)
            s_copy["centre_name"] = centres.get(cid, "Unknown Centre")
            latest_by_centre[cid] = s_copy

    all_scores = list(latest_by_centre.values())
    if not all_scores:
        return ComplianceOverviewResponse(
            average_score=0.0,
            category_counts={"excellent": 0, "good": 0, "needs_improvement": 0, "critical": 0},
            top_performing_centres=[],
            critical_centres=[],
            all_scores=[]
        )

    cat_counts = {"excellent": 0, "good": 0, "needs_improvement": 0, "critical": 0}
    for sc in all_scores:
        cat = sc.get("compliance_category", "needs_improvement")
        cat_counts[cat] = cat_counts.get(cat, 0) + 1

    avg_score = round(sum(s["overall_score"] for s in all_scores) / len(all_scores), 2)
    sorted_scores = sorted(all_scores, key=lambda x: x["overall_score"], reverse=True)

    return ComplianceOverviewResponse(
        average_score=avg_score,
        category_counts=cat_counts,
        top_performing_centres=[ComplianceScoreResponse(**s) for s in sorted_scores[:3]],
        critical_centres=[ComplianceScoreResponse(**s) for s in sorted_scores if s["overall_score"] < 70.0],
        all_scores=[ComplianceScoreResponse(**s) for s in sorted_scores]
    )

@router.get("/centre/{centre_id}", response_model=ComplianceScoreResponse)
async def get_centre_compliance(centre_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    supabase = get_supabase()
    res = supabase.table("compliance_scores").select("*").eq("centre_id", centre_id).order("calculation_date", desc=True).limit(1).execute()
    if not res.data:
        # Calculate freshly
        computed = compliance_service.calculate_centre_compliance(centre_id)
        c_res = supabase.table("training_centres").select("name").eq("id", centre_id).execute()
        computed["centre_name"] = c_res.data[0]["name"] if c_res.data else "Unknown"
        return ComplianceScoreResponse(**computed)

    score = res.data[0]
    c_res = supabase.table("training_centres").select("name").eq("id", centre_id).execute()
    score["centre_name"] = c_res.data[0]["name"] if c_res.data else "Unknown"
    return ComplianceScoreResponse(**score)

@router.post("/recalculate")
async def recalculate_compliance(
    payload: ComplianceRecalculateRequest,
    admin_user: Dict[str, Any] = Depends(get_current_admin)
):
    if payload.centre_id:
        res = compliance_service.calculate_centre_compliance(payload.centre_id, payload.weights)
        return {"message": "Recalculation completed for centre.", "results": [res]}
    else:
        results = compliance_service.recalculate_all(payload.weights)
        return {"message": f"Recalculation completed for all {len(results)} centres.", "results": results}
