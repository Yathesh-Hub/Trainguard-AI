import io
import uuid
import pandas as pd
from typing import Dict, Any, List, Optional
from datetime import datetime, date
from fastapi import HTTPException
from app.services.supabase_client import get_supabase
from app.services.storage_service import StorageService
from app.ai.anomaly_detector import AttendanceAnomalyDetector

class AttendanceService:
    def __init__(self):
        self.anomaly_detector = AttendanceAnomalyDetector()

    async def process_attendance_file(
        self,
        file_content: bytes,
        filename: str,
        centre_id: str,
        uploaded_doc_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Parses CSV or Excel attendance, verifies students, inserts records,
        computes statistics, and runs AI anomaly detection.
        """
        # Read file into DataFrame
        try:
            if filename.endswith(".csv"):
                df = pd.read_csv(io.BytesIO(file_content))
            else:
                df = pd.read_excel(io.BytesIO(file_content))
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to parse attendance document: {str(e)}")

        # Normalize column headers
        col_map = {}
        for col in df.columns:
            cleaned = str(col).strip().lower().replace(" ", "_")
            if "student_id" in cleaned or "student_code" in cleaned or "roll" in cleaned:
                col_map[col] = "student_id"
            elif "student_name" in cleaned or "name" in cleaned:
                col_map[col] = "student_name"
            elif "date" in cleaned:
                col_map[col] = "date"
            elif "batch" in cleaned:
                col_map[col] = "batch"
            elif "status" in cleaned or "attendance" in cleaned:
                col_map[col] = "status"

        df = df.rename(columns=col_map)
        required_cols = {"student_id", "date", "status"}
        if not required_cols.issubset(set(df.columns)):
            raise HTTPException(
                status_code=400,
                detail=f"Attendance file must contain headers for Student ID, Date, and Attendance Status. Detected headers: {list(df.columns)}"
            )

        supabase = get_supabase()

        # Query existing students in this centre
        stu_res = supabase.table("students").select("id, student_id, batch_id").eq("centre_id", centre_id).execute()
        student_lookup = {s["student_id"]: s for s in stu_res.data}
        student_id_to_uuid = {s["student_id"]: s["id"] for s in stu_res.data}

        # Query batches for this centre
        batch_res = supabase.table("batches").select("id, batch_code").eq("centre_id", centre_id).execute()
        batch_lookup = {b["batch_code"]: b["id"] for b in batch_res.data}

        # Fetch existing attendance to check duplicates
        existing_att_res = supabase.table("attendance_records").select("student_id, date").eq("centre_id", centre_id).execute()
        existing_keys = {(r["student_id"], str(r["date"])) for r in existing_att_res.data}

        inserted_count = 0
        duplicate_count = 0
        unknown_students = set()
        new_records = []

        for _, row in df.iterrows():
            raw_stu_id = str(row["student_id"]).strip()
            raw_date = row["date"]
            raw_status = str(row["status"]).strip().lower()

            # Parse date
            try:
                if isinstance(raw_date, (datetime, date)):
                    date_str = raw_date.strftime("%Y-%m-%d")
                else:
                    date_str = pd.to_datetime(raw_date).strftime("%Y-%m-%d")
            except Exception:
                continue

            if raw_stu_id not in student_id_to_uuid:
                unknown_students.add(raw_stu_id)
                continue

            student_uuid = student_id_to_uuid[raw_stu_id]
            student_info = student_lookup[raw_stu_id]

            # Normalize status
            if "present" in raw_status or raw_status in ("p", "1"):
                status_val = "present"
            elif "late" in raw_status or raw_status == "l":
                status_val = "late"
            elif "excuse" in raw_status or raw_status == "e":
                status_val = "excused"
            else:
                status_val = "absent"

            # Check duplicate
            if (student_uuid, date_str) in existing_keys:
                duplicate_count += 1
                continue

            # Determine batch ID
            batch_id = student_info.get("batch_id")
            if "batch" in df.columns and str(row.get("batch")) in batch_lookup:
                batch_id = batch_lookup[str(row.get("batch"))]

            rec_id = str(uuid.uuid4())
            record = {
                "id": rec_id,
                "student_id": student_uuid,
                "batch_id": batch_id,
                "centre_id": centre_id,
                "date": date_str,
                "status": status_val,
                "remarks": None,
                "uploaded_document_id": uploaded_doc_id
            }
            new_records.append(record)
            existing_keys.add((student_uuid, date_str))
            inserted_count += 1

        if new_records:
            supabase.table("attendance_records").insert(new_records).execute()

        # Run AI Anomaly Detection on the updated attendance data
        all_att_res = supabase.table("attendance_records").select("*").eq("centre_id", centre_id).execute()
        trainer_res = supabase.table("trainer_attendance").select("*").eq("centre_id", centre_id).execute()

        anomalies = self.anomaly_detector.detect_attendance_anomalies(
            centre_id=centre_id,
            attendance_records=all_att_res.data,
            trainer_records=trainer_res.data
        )

        anomalies_detected_count = len(anomalies)
        if anomalies:
            for anom in anomalies:
                anom["id"] = str(uuid.uuid4())
            supabase.table("anomaly_records").insert(anomalies).execute()

        return {
            "total_records": len(df),
            "inserted_records": inserted_count,
            "duplicate_records": duplicate_count,
            "unknown_students": list(unknown_students),
            "anomalies_detected": anomalies_detected_count,
            "message": f"Successfully processed {inserted_count} attendance records. {duplicate_count} duplicate entries skipped."
        }

    def get_attendance_analytics(self, centre_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Calculates attendance statistics:
        - Overall percentage
        - Category breakdown (Present, Absent, Late, Excused)
        - Performance thresholds (Excellent: 90-100%, Good: 75-89%, Warning: 60-74%, Critical: <60%)
        - Daily trends
        - Batch comparisons
        - Low attendance student alert list
        """
        supabase = get_supabase()

        att_query = supabase.table("attendance_records").select("*")
        stu_query = supabase.table("students").select("*")
        batch_query = supabase.table("batches").select("*")

        if centre_id:
            att_query = att_query.eq("centre_id", centre_id)
            stu_query = stu_query.eq("centre_id", centre_id)
            batch_query = batch_query.eq("centre_id", centre_id)

        att_records = att_query.execute().data
        students = stu_query.execute().data
        batches = batch_query.execute().data

        if not att_records:
            return {
                "overall_percentage": 0.0,
                "total_records": 0,
                "category_breakdown": {"present": 0, "absent": 0, "late": 0, "excused": 0},
                "threshold_counts": {"excellent": 0, "good": 0, "warning": 0, "critical": 0},
                "daily_trends": [],
                "batch_trends": [],
                "low_attendance_students": []
            }

        df = pd.DataFrame(att_records)
        total_records = len(df)
        cat_counts = df["status"].value_counts().to_dict()

        # Calculate student-level attendance %
        stu_lookup = {s["id"]: s for s in students}
        batch_lookup = {b["id"]: b for b in batches}

        student_agg = df.groupby("student_id").agg(
            total=("id", "count"),
            present=("status", lambda s: (s == "present").sum()),
            late=("status", lambda s: (s == "late").sum())
        ).reset_index()

        student_agg["rate"] = ((student_agg["present"] + student_agg["late"] * 0.5) / student_agg["total"]) * 100
        overall_percentage = round(float(student_agg["rate"].mean()), 2)

        # Categorize students by threshold
        thresholds = {"excellent": 0, "good": 0, "warning": 0, "critical": 0}
        low_students = []

        for _, row in student_agg.iterrows():
            rate = float(row["rate"])
            s_info = stu_lookup.get(row["student_id"], {})
            b_info = batch_lookup.get(s_info.get("batch_id"), {})

            if rate >= 90.0:
                thresholds["excellent"] += 1
            elif rate >= 75.0:
                thresholds["good"] += 1
            elif rate >= 60.0:
                thresholds["warning"] += 1
            else:
                thresholds["critical"] += 1

            if rate < 75.0:
                low_students.append({
                    "id": row["student_id"],
                    "student_id": s_info.get("student_id", "N/A"),
                    "name": s_info.get("full_name", "Unknown"),
                    "batch": b_info.get("batch_code", "N/A"),
                    "course": s_info.get("course", "N/A"),
                    "attendance_rate": round(rate, 1),
                    "classes_attended": int(row["present"]),
                    "total_classes": int(row["total"]),
                    "status_badge": "Critical" if rate < 60.0 else "Warning"
                })

        low_students.sort(key=lambda x: x["attendance_rate"])

        # Daily timeline trends
        df["date"] = pd.to_datetime(df["date"])
        daily = df.groupby(df["date"].dt.strftime("%Y-%m-%d")).agg(
            total=("id", "count"),
            present=("status", lambda s: (s == "present").sum()),
            absent=("status", lambda s: (s == "absent").sum()),
            late=("status", lambda s: (s == "late").sum())
        ).reset_index()
        daily["rate"] = round(((daily["present"] + daily["late"] * 0.5) / daily["total"]) * 100, 1)
        daily_trends = daily.rename(columns={"date": "date_str"}).to_dict(orient="records")

        # Batch-level comparison trends
        batch_trends = []
        if "batch_id" in df.columns:
            b_agg = df.groupby("batch_id").agg(
                total=("id", "count"),
                present=("status", lambda s: (s == "present").sum()),
                late=("status", lambda s: (s == "late").sum()),
                unique_students=("student_id", "nunique")
            ).reset_index()

            for _, brow in b_agg.iterrows():
                bid = brow["batch_id"]
                b_info = batch_lookup.get(bid, {})
                brate = round(((brow["present"] + brow["late"] * 0.5) / brow["total"]) * 100, 1)
                batch_trends.append({
                    "batch_id": bid,
                    "batch_code": b_info.get("batch_code", "N/A"),
                    "course_name": b_info.get("course_name", "General Course"),
                    "average_percentage": brate,
                    "total_students": int(brow["unique_students"])
                })

        return {
            "overall_percentage": overall_percentage,
            "total_records": total_records,
            "category_breakdown": {
                "present": int(cat_counts.get("present", 0)),
                "absent": int(cat_counts.get("absent", 0)),
                "late": int(cat_counts.get("late", 0)),
                "excused": int(cat_counts.get("excused", 0))
            },
            "threshold_counts": thresholds,
            "daily_trends": daily_trends,
            "batch_trends": batch_trends,
            "low_attendance_students": low_students[:15]
        }

attendance_service = AttendanceService()
