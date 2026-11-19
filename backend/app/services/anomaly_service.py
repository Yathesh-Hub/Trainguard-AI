from typing import List, Dict, Any, Optional
from fastapi import HTTPException
from app.services.supabase_client import get_supabase

class AnomalyService:
    def get_anomalies(
        self,
        centre_id: Optional[str] = None,
        severity: Optional[str] = None,
        review_status: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        supabase = get_supabase()
        query = supabase.table("anomaly_records").select("*")

        if centre_id:
            query = query.eq("centre_id", centre_id)
        if severity:
            query = query.eq("severity", severity)
        if review_status:
            query = query.eq("review_status", review_status)

        anomalies = query.order("created_at", desc=True).execute().data

        # Enrich with centre name
        centres = {c["id"]: c["name"] for c in supabase.table("training_centres").select("id, name").execute().data}
        for an in anomalies:
            an["centre_name"] = centres.get(an.get("centre_id"), "Unknown Centre")

        return anomalies

    def update_status(
        self,
        anomaly_id: str,
        review_status: str,
        review_notes: Optional[str] = None,
        reviewer_id: Optional[str] = None
    ) -> Dict[str, Any]:
        valid_statuses = {"open", "under_review", "resolved", "false_positive"}
        if review_status not in valid_statuses:
            raise HTTPException(status_code=400, detail=f"Invalid review status. Must be one of {valid_statuses}")

        supabase = get_supabase()
        payload = {
            "review_status": review_status,
            "reviewed_by": reviewer_id,
            "review_notes": review_notes
        }
        res = supabase.table("anomaly_records").update(payload).eq("id", anomaly_id).execute()
        return res.data[0] if res.data else payload

anomaly_service = AnomalyService()
