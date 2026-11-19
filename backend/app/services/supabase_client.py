import os
import json
import uuid
import logging
from typing import Any, Dict, List, Optional
from datetime import datetime, date

logger = logging.getLogger("trainguard.supabase")

_client_instance = None

def get_supabase():
    global _client_instance
    if _client_instance is not None:
        return _client_instance

    from app.core.config import settings
    url = settings.SUPABASE_URL
    key = settings.SUPABASE_SERVICE_ROLE_KEY

    local_client = LocalSupabaseClient()

    if url and key and not url.startswith("https://xyzcompany") and not key.startswith("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."):
        try:
            from supabase import create_client
            remote_client = create_client(url, key)
            logger.info("Connecting to Supabase project: %s", url)
            _client_instance = HybridSupabaseClient(remote_client, local_client)
            return _client_instance
        except Exception as e:
            logger.warning("Failed to initialize remote Supabase client (%s). Using local repository provider.", e)

    _client_instance = local_client
    return _client_instance


class LocalSupabaseResponse:
    def __init__(self, data: Any, count: Optional[int] = None):
        self.data = data
        self.count = count if count is not None else (len(data) if isinstance(data, list) else 1)


class LocalQueryBuilder:
    def __init__(self, table_name: str, client: 'LocalSupabaseClient'):
        self.table_name = table_name
        self.client = client
        self.filters = []
        self._select_fields = "*"
        self._order_col = None
        self._order_desc = False
        self._limit_val = None
        self._offset_val = 0
        self._operation = "SELECT"
        self._payload = None

    def select(self, fields: str = "*", count: Optional[str] = None):
        self._select_fields = fields
        self._operation = "SELECT"
        return self

    def insert(self, data: Any):
        self._operation = "INSERT"
        self._payload = data
        return self

    def update(self, data: Any):
        self._operation = "UPDATE"
        self._payload = data
        return self

    def delete(self):
        self._operation = "DELETE"
        return self

    def eq(self, column: str, value: Any):
        self.filters.append((column, "eq", str(value) if isinstance(value, uuid.UUID) else value))
        return self

    def neq(self, column: str, value: Any):
        self.filters.append((column, "neq", str(value) if isinstance(value, uuid.UUID) else value))
        return self

    def gte(self, column: str, value: Any):
        self.filters.append((column, "gte", value))
        return self

    def lte(self, column: str, value: Any):
        self.filters.append((column, "lte", value))
        return self

    def order(self, column: str, desc: bool = False):
        self._order_col = column
        self._order_desc = desc
        return self

    def limit(self, count: int):
        self._limit_val = count
        return self

    def range(self, start: int, end: int):
        self._offset_val = start
        self._limit_val = end - start + 1
        return self

    def execute(self) -> LocalSupabaseResponse:
        records = self.client.store.setdefault(self.table_name, [])

        if self._operation == "INSERT":
            items = self._payload if isinstance(self._payload, list) else [self._payload]
            inserted = []
            for item in items:
                rec = dict(item)
                if "id" not in rec or not rec["id"]:
                    rec["id"] = str(uuid.uuid4())
                now_iso = datetime.now().isoformat() + "Z"
                if "created_at" not in rec:
                    rec["created_at"] = now_iso
                if "updated_at" not in rec:
                    rec["updated_at"] = now_iso
                records.append(rec)
                inserted.append(rec)
            return LocalSupabaseResponse(inserted if isinstance(self._payload, list) else inserted[0])

        matching = []
        indices = []
        for idx, rec in enumerate(records):
            matches = True
            for col, op, val in self.filters:
                rec_val = rec.get(col)
                if isinstance(rec_val, (date, datetime)) and isinstance(val, str):
                    rec_val = str(rec_val)
                if op == "eq" and str(rec_val) != str(val):
                    matches = False
                    break
                elif op == "neq" and str(rec_val) == str(val):
                    matches = False
                    break
                elif op == "gte" and rec_val is not None and rec_val < val:
                    matches = False
                    break
                elif op == "lte" and rec_val is not None and rec_val > val:
                    matches = False
                    break
            if matches:
                matching.append(rec)
                indices.append(idx)

        if self._operation == "UPDATE":
            updated_items = []
            now_iso = datetime.now().isoformat() + "Z"
            for idx in indices:
                records[idx].update(self._payload)
                records[idx]["updated_at"] = now_iso
                updated_items.append(records[idx])
            return LocalSupabaseResponse(updated_items)

        if self._operation == "DELETE":
            deleted_items = []
            for idx in sorted(indices, reverse=True):
                deleted_items.append(records.pop(idx))
            return LocalSupabaseResponse(deleted_items)

        # SELECT
        res = list(matching)
        if self._order_col:
            res.sort(
                key=lambda x: (x.get(self._order_col) is None, x.get(self._order_col)),
                reverse=self._order_desc
            )
        if self._offset_val:
            res = res[self._offset_val:]
        if self._limit_val is not None:
            res = res[:self._limit_val]

        return LocalSupabaseResponse(res)


class LocalStorageBucket:
    def __init__(self, name: str, base_dir: str):
        self.name = name
        self.base_dir = os.path.join(base_dir, name)
        os.makedirs(self.base_dir, exist_ok=True)

    def upload(self, path: str, file_content: bytes, file_options: Optional[Dict] = None):
        target_path = os.path.join(self.base_dir, path.replace("/", os.sep))
        os.makedirs(os.path.dirname(target_path), exist_ok=True)
        with open(target_path, "wb") as f:
            f.write(file_content)
        return {"Key": f"{self.name}/{path}"}

    def create_signed_url(self, path: str, expires_in: int = 3600):
        return {"signedURL": f"/api/storage/{self.name}/{path}?expires={expires_in}"}

    def get_public_url(self, path: str):
        return f"/api/storage/{self.name}/{path}"


class LocalStorageClient:
    def __init__(self, base_dir: str):
        self.base_dir = base_dir

    def from_(self, bucket_name: str) -> LocalStorageBucket:
        return LocalStorageBucket(bucket_name, self.base_dir)


class LocalSupabaseClient:
    def __init__(self):
        self.store: Dict[str, List[Dict[str, Any]]] = {}
        from app.core.config import settings
        self.storage = LocalStorageClient(str(settings.UPLOAD_DIR))
        self._load_seed_data()

    def table(self, table_name: str) -> LocalQueryBuilder:
        return LocalQueryBuilder(table_name, self)

    def _load_seed_data(self):
        """Loads seed data directly into in-memory store"""
        import sys
        from pathlib import Path
        # generate_seed.py lives at project root (e:\p2)
        # __file__ = e:\p2\backend\app\services\supabase_client.py
        # parents: [0]=services, [1]=app, [2]=backend, [3]=p2
        _project_root = str(Path(__file__).resolve().parents[3])
        if _project_root not in sys.path:
            sys.path.insert(0, _project_root)
        from generate_seed import (
            centres_data, profiles_data, courses, trainer_names,
            first_names, last_names, infra_reqs, inspections_data,
            findings_data, anomalies_data, scores_data, get_uuid
        )
        import random
        from datetime import date, timedelta

        self.store["training_centres"] = []
        for c_key, code, name, addr, dist, st, contact, phone, email, cap, est, status in centres_data:
            self.store["training_centres"].append({
                "id": get_uuid(c_key),
                "centre_code": code,
                "name": name,
                "address": addr,
                "district": dist,
                "state": st,
                "contact_person": contact,
                "phone": phone,
                "email": email,
                "total_capacity": cap,
                "establishment_date": est,
                "status": status,
                "created_at": "2024-01-01T00:00:00Z",
                "updated_at": "2024-01-01T00:00:00Z"
            })

        self.store["profiles"] = []
        for uid, email, fname, role, cid_val, ph in profiles_data:
            self.store["profiles"].append({
                "id": uid,
                "email": email,
                "full_name": fname,
                "role": role,
                "centre_id": cid_val,
                "phone": ph,
                "is_active": True,
                "created_at": "2024-01-01T00:00:00Z",
                "updated_at": "2024-01-01T00:00:00Z"
            })

        self.store["batches"] = []
        batch_keys = []
        batch_idx = 1
        for c_idx in range(1, 6):
            cid = get_uuid(f"tc_{c_idx}")
            for b_offset in range(2):
                b_key = f"batch_{batch_idx}"
                bid = get_uuid(b_key)
                batch_keys.append((b_key, bid, cid))
                code = f"BAT-{c_idx:02d}-{b_offset+1:02d}"
                self.store["batches"].append({
                    "id": bid,
                    "batch_code": code,
                    "centre_id": cid,
                    "course_name": courses[b_offset][1],
                    "start_date": "2024-01-10",
                    "end_date": "2024-06-30",
                    "timing": courses[b_offset][2],
                    "status": "ongoing",
                    "created_at": "2024-01-01T00:00:00Z",
                    "updated_at": "2024-01-01T00:00:00Z"
                })
                batch_idx += 1

        self.store["trainers"] = []
        for t_idx, (t_name, t_mail, t_sub, t_ph) in enumerate(trainer_names, start=1):
            c_idx = ((t_idx - 1) // 3) + 1
            cid = get_uuid(f"tc_{c_idx}")
            tid = get_uuid(f"trainer_{t_idx}")
            b_key_assigned = get_uuid(f"batch_{((c_idx-1)*2) + 1}")
            self.store["trainers"].append({
                "id": tid,
                "trainer_id": f"TRN-{t_idx:03d}",
                "name": t_name,
                "email": t_mail,
                "phone": t_ph,
                "subject": t_sub,
                "assigned_centre_id": cid,
                "assigned_batch_id": b_key_assigned,
                "employment_status": "active",
                "created_at": "2024-01-01T00:00:00Z",
                "updated_at": "2024-01-01T00:00:00Z"
            })

        self.store["students"] = []
        stu_keys = []
        stu_idx = 1
        for c_idx in range(1, 6):
            cid = get_uuid(f"tc_{c_idx}")
            for b_offset in range(2):
                batch_num = ((c_idx - 1) * 2) + b_offset + 1
                bid = get_uuid(f"batch_{batch_num}")
                course = "Full Stack Web Development" if b_offset == 0 else "Data Analytics & Python"
                for s_in_batch in range(10):
                    sid = get_uuid(f"stu_{stu_idx}")
                    fname = f"{first_names[(stu_idx - 1) % len(first_names)]} {last_names[(stu_idx * 3) % len(last_names)]}"
                    code = f"STU-2024-{stu_idx:03d}"
                    stu_keys.append((sid, cid, bid, code))
                    self.store["students"].append({
                        "id": sid,
                        "student_id": code,
                        "full_name": fname,
                        "email": f"student{stu_idx}@example.org",
                        "phone": f"+91 97000 {stu_idx:05d}",
                        "course": course,
                        "batch_id": bid,
                        "centre_id": cid,
                        "joining_date": "2024-01-15",
                        "status": "active",
                        "created_at": "2024-01-15T00:00:00Z",
                        "updated_at": "2024-01-15T00:00:00Z"
                    })
                    stu_idx += 1

        self.store["infrastructure_requirements"] = []
        for r_key, item_name, cat, desc, min_q, mand in infra_reqs:
            self.store["infrastructure_requirements"].append({
                "id": get_uuid(r_key),
                "item_name": item_name,
                "category": cat,
                "description": desc,
                "minimum_quantity": min_q,
                "is_mandatory": mand,
                "created_at": "2024-01-01T00:00:00Z"
            })

        self.store["infrastructure_inspections"] = []
        for ins_key, cid, room, img, status, remarks in inspections_data:
            self.store["infrastructure_inspections"].append({
                "id": get_uuid(ins_key),
                "centre_id": cid,
                "inspector_id": get_uuid("user_admin"),
                "inspection_date": "2024-02-15",
                "room_name": room,
                "image_path": img,
                "image_signed_url": f"/api/storage/infrastructure-images/{img}",
                "overall_compliance_status": status,
                "remarks": remarks,
                "created_at": "2024-02-15T10:00:00Z"
            })

        self.store["infrastructure_findings"] = []
        for insp_id, req_id, label, conf, bbox, ai_det, h_ver, v_stat, notes in findings_data:
            self.store["infrastructure_findings"].append({
                "id": str(uuid.uuid4()),
                "inspection_id": insp_id,
                "requirement_id": req_id,
                "detected_label": label,
                "confidence_score": conf,
                "bounding_box": json.loads(bbox),
                "ai_detected": ai_det,
                "human_verified": h_ver,
                "verification_status": v_stat,
                "inspector_notes": notes,
                "created_at": "2024-02-15T10:30:00Z"
            })

        self.store["anomaly_records"] = []
        for cid, cat, desc, sev, a_date, ev_json, r_stat, r_notes in anomalies_data:
            self.store["anomaly_records"].append({
                "id": str(uuid.uuid4()),
                "centre_id": cid,
                "category": cat,
                "description": desc,
                "severity": sev,
                "anomaly_date": a_date,
                "evidence": json.loads(ev_json),
                "review_status": r_stat,
                "reviewed_by": get_uuid("user_admin"),
                "review_notes": r_notes,
                "created_at": "2024-02-15T12:00:00Z",
                "updated_at": "2024-02-15T12:00:00Z"
            })

        self.store["compliance_scores"] = []
        for cid, overall, att, trn, inf, doc, cov, cat, prev, recs in scores_data:
            self.store["compliance_scores"].append({
                "id": str(uuid.uuid4()),
                "centre_id": cid,
                "calculation_date": "2024-02-18",
                "overall_score": overall,
                "attendance_score": att,
                "trainer_score": trn,
                "infrastructure_score": inf,
                "documentation_score": doc,
                "weights_used": {"attendance": 0.35, "trainer": 0.20, "infrastructure": 0.30, "documentation": 0.15},
                "evidence_coverage_percentage": cov,
                "compliance_category": cat,
                "recommendations": json.loads(recs),
                "previous_score": prev,
                "created_at": "2024-02-18T18:00:00Z"
            })

        self.store["attendance_records"] = []
        start_dt = date(2024, 1, 15)
        dates = []
        curr = start_dt
        while len(dates) < 25:
            if curr.weekday() != 6:
                dates.append(curr)
            curr += timedelta(days=1)

        random.seed(42)
        for sid, cid, bid, scode in stu_keys:
            if cid == get_uuid("tc_1"):
                base_p = 0.95
            elif cid == get_uuid("tc_2"):
                base_p = 0.86
            elif cid == get_uuid("tc_3"):
                base_p = 0.68
            elif cid == get_uuid("tc_4"):
                base_p = 0.97
            else:
                base_p = 0.58

            for d in dates:
                roll = random.random()
                if roll < base_p:
                    stat = 'present'
                elif roll < base_p + 0.05:
                    stat = 'late'
                elif roll < base_p + 0.08:
                    stat = 'excused'
                else:
                    stat = 'absent'
                self.store["attendance_records"].append({
                    "id": str(uuid.uuid4()),
                    "student_id": sid,
                    "batch_id": bid,
                    "centre_id": cid,
                    "date": d.isoformat(),
                    "status": stat,
                    "remarks": None,
                    "created_at": f"{d.isoformat()}T09:00:00Z"
                })

        self.store["trainer_attendance"] = []
        for t_idx in range(1, 16):
            c_idx = ((t_idx - 1) // 3) + 1
            cid = get_uuid(f"tc_{c_idx}")
            tid = get_uuid(f"trainer_{t_idx}")
            for d in dates:
                roll = random.random()
                if roll < 0.92:
                    stat = 'present'
                    hrs = 4.0
                elif roll < 0.96:
                    stat = 'half_day'
                    hrs = 2.0
                else:
                    stat = 'on_leave'
                    hrs = 0.0
                self.store["trainer_attendance"].append({
                    "id": str(uuid.uuid4()),
                    "trainer_id": tid,
                    "centre_id": cid,
                    "date": d.isoformat(),
                    "status": stat,
                    "session_hours": hrs,
                    "remarks": None,
                    "created_at": f"{d.isoformat()}T08:30:00Z"
                })

        self.store["uploaded_documents"] = []
        self.store["audit_logs"] = []
        self.store["training_sessions"] = []


class HybridQueryBuilder:
    def __init__(self, table_name: str, remote_client, local_client: LocalSupabaseClient):
        self.table_name = table_name
        self.remote_client = remote_client
        self.local_client = local_client
        self.remote_qb = remote_client.table(table_name)
        self.local_qb = local_client.table(table_name)
        self.fallback_only = False

    def select(self, fields: str = "*", count: Optional[str] = None):
        try:
            self.remote_qb = self.remote_qb.select(fields)
        except Exception:
            self.fallback_only = True
        self.local_qb.select(fields, count)
        return self

    def insert(self, data: Any):
        try:
            self.remote_qb = self.remote_qb.insert(data)
        except Exception:
            self.fallback_only = True
        self.local_qb.insert(data)
        return self

    def update(self, data: Any):
        try:
            self.remote_qb = self.remote_qb.update(data)
        except Exception:
            self.fallback_only = True
        self.local_qb.update(data)
        return self

    def delete(self):
        try:
            self.remote_qb = self.remote_qb.delete()
        except Exception:
            self.fallback_only = True
        self.local_qb.delete()
        return self

    def eq(self, column: str, value: Any):
        try:
            self.remote_qb = self.remote_qb.eq(column, value)
        except Exception:
            self.fallback_only = True
        self.local_qb.eq(column, value)
        return self

    def neq(self, column: str, value: Any):
        try:
            self.remote_qb = self.remote_qb.neq(column, value)
        except Exception:
            self.fallback_only = True
        self.local_qb.neq(column, value)
        return self

    def gte(self, column: str, value: Any):
        try:
            self.remote_qb = self.remote_qb.gte(column, value)
        except Exception:
            self.fallback_only = True
        self.local_qb.gte(column, value)
        return self

    def lte(self, column: str, value: Any):
        try:
            self.remote_qb = self.remote_qb.lte(column, value)
        except Exception:
            self.fallback_only = True
        self.local_qb.lte(column, value)
        return self

    def order(self, column: str, desc: bool = False):
        try:
            self.remote_qb = self.remote_qb.order(column, desc=desc)
        except Exception:
            self.fallback_only = True
        self.local_qb.order(column, desc=desc)
        return self

    def limit(self, count: int):
        try:
            self.remote_qb = self.remote_qb.limit(count)
        except Exception:
            self.fallback_only = True
        self.local_qb.limit(count)
        return self

    def range(self, start: int, end: int):
        try:
            self.remote_qb = self.remote_qb.range(start, end)
        except Exception:
            self.fallback_only = True
        self.local_qb.range(start, end)
        return self

    def execute(self):
        if not self.fallback_only:
            try:
                res = self.remote_qb.execute()
                # If remote table returned data, return it
                if res and hasattr(res, "data") and res.data is not None:
                    # If empty data on a select, fallback to local seed if local has records
                    if isinstance(res.data, list) and len(res.data) == 0 and len(self.local_client.store.get(self.table_name, [])) > 0:
                        return self.local_qb.execute()
                    return res
            except Exception as e:
                logger.info("Remote Supabase table '%s' inaccessible (%s). Falling back to local data store.", self.table_name, e)

        return self.local_qb.execute()


class HybridStorageBucket:
    def __init__(self, name: str, remote_bucket, local_bucket: LocalStorageBucket):
        self.name = name
        self.remote_bucket = remote_bucket
        self.local_bucket = local_bucket

    def upload(self, path: str, file_content: bytes, file_options: Optional[Dict] = None):
        try:
            return self.remote_bucket.upload(path, file_content, file_options)
        except Exception as e:
            logger.info("Remote storage upload failed (%s). Saving to local bucket.", e)
            return self.local_bucket.upload(path, file_content, file_options)

    def create_signed_url(self, path: str, expires_in: int = 3600):
        try:
            res = self.remote_bucket.create_signed_url(path, expires_in)
            if res and ("signedURL" in res or hasattr(res, "signed_url")):
                return res
        except Exception:
            pass
        return self.local_bucket.create_signed_url(path, expires_in)

    def get_public_url(self, path: str):
        try:
            return self.remote_bucket.get_public_url(path)
        except Exception:
            return self.local_bucket.get_public_url(path)


class HybridStorageClient:
    def __init__(self, remote_storage, local_storage: LocalStorageClient):
        self.remote_storage = remote_storage
        self.local_storage = local_storage

    def from_(self, bucket_name: str) -> HybridStorageBucket:
        remote_b = None
        try:
            remote_b = self.remote_storage.from_(bucket_name)
        except Exception:
            pass
        local_b = self.local_storage.from_(bucket_name)
        return HybridStorageBucket(bucket_name, remote_b, local_b)


class HybridSupabaseClient:
    def __init__(self, remote_client, local_client: LocalSupabaseClient):
        self.remote_client = remote_client
        self.local_client = local_client
        self.storage = HybridStorageClient(remote_client.storage, local_client.storage)

    def table(self, table_name: str) -> HybridQueryBuilder:
        return HybridQueryBuilder(table_name, self.remote_client, self.local_client)
