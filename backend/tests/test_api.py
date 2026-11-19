import pytest
import os
import sys
from io import BytesIO
from fastapi.testclient import TestClient

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "Supabase" in data["database_backend"]

def test_admin_login():
    # Login as demo admin
    res = client.post("/api/auth/login", json={
        "email": "admin@trainguard.ai",
        "password": "Password123!"
    })
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["user"]["role"] == "admin"
    return data["access_token"]

def test_manager_login():
    # Login as demo manager
    res = client.post("/api/auth/login", json={
        "email": "manager@apex.trainguard.ai",
        "password": "Password123!"
    })
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["user"]["role"] == "centre_manager"
    return data["access_token"]

def test_list_centres():
    admin_token = test_admin_login()
    headers = {"Authorization": f"Bearer {admin_token}"}
    res = client.get("/api/centres", headers=headers)
    assert res.status_code == 200
    centres = res.json()
    assert len(centres) >= 5
    assert any(c["centre_code"] == "TC-101" for c in centres)

def test_get_centre_detail():
    admin_token = test_admin_login()
    headers = {"Authorization": f"Bearer {admin_token}"}
    centres = client.get("/api/centres", headers=headers).json()
    first_id = centres[0]["id"]

    res = client.get(f"/api/centres/{first_id}", headers=headers)
    assert res.status_code == 200
    detail = res.json()
    assert "batches" in detail
    assert "trainers" in detail

def test_list_students():
    admin_token = test_admin_login()
    headers = {"Authorization": f"Bearer {admin_token}"}
    res = client.get("/api/students", headers=headers)
    assert res.status_code == 200
    students = res.json()
    assert len(students) >= 50
    assert "attendance_percentage" in students[0]

def test_attendance_analytics():
    admin_token = test_admin_login()
    headers = {"Authorization": f"Bearer {admin_token}"}
    res = client.get("/api/attendance/analytics", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "overall_percentage" in data
    assert "threshold_counts" in data
    assert "daily_trends" in data
    assert "batch_trends" in data

def test_attendance_csv_upload():
    admin_token = test_admin_login()
    headers = {"Authorization": f"Bearer {admin_token}"}
    centres = client.get("/api/centres", headers=headers).json()
    cid = centres[0]["id"]

    csv_content = b"""Student ID,Student Name,Date,Batch,Attendance Status
STU-2024-001,Aarav Sharma,2024-02-25,BAT-01-01,Present
STU-2024-002,Aditi Hegde,2024-02-25,BAT-01-01,Absent
STU-2024-003,Akhil Bhat,2024-02-25,BAT-01-01,Present
"""
    files = {"file": ("test_att.csv", BytesIO(csv_content), "text/csv")}
    data = {"centre_id": cid}

    res = client.post("/api/attendance/upload", headers=headers, files=files, data=data)
    assert res.status_code == 200
    result = res.json()
    assert result["total_records"] == 3
    assert result["inserted_records"] >= 0

def test_infrastructure_inspection_and_cv():
    import cv2
    import numpy as np
    admin_token = test_admin_login()
    headers = {"Authorization": f"Bearer {admin_token}"}
    centres = client.get("/api/centres", headers=headers).json()
    cid = centres[0]["id"]

    # Generate test image
    test_img = np.full((300, 400, 3), 200, dtype=np.uint8)
    # Add a red cylinder (simulating fire extinguisher)
    cv2.rectangle(test_img, (50, 80), (85, 200), (0, 0, 220), -1)
    # Add a whiteboard
    cv2.rectangle(test_img, (120, 50), (320, 150), (250, 250, 250), -1)
    _, img_encoded = cv2.imencode(".jpg", test_img)

    files = {"file": ("test_classroom.jpg", BytesIO(img_encoded.tobytes()), "image/jpeg")}
    data = {"centre_id": cid, "room_name": "Test Lab 101", "remarks": "Unit test automated run"}

    res = client.post("/api/infrastructure/upload", headers=headers, files=files, data=data)
    assert res.status_code == 201
    inspection = res.json()
    assert "findings" in inspection
    assert len(inspection["findings"]) > 0

    # Test verify finding
    finding_id = inspection["findings"][0]["id"]
    verify_res = client.post(
        f"/api/infrastructure/verify/{finding_id}",
        headers=headers,
        json={"verification_status": "verified", "inspector_notes": "Auditor checked"}
    )
    assert verify_res.status_code == 200

def test_compliance_engine():
    admin_token = test_admin_login()
    headers = {"Authorization": f"Bearer {admin_token}"}
    res = client.get("/api/compliance/overview", headers=headers)
    assert res.status_code == 200
    overview = res.json()
    assert "average_score" in overview
    assert "all_scores" in overview
    assert len(overview["all_scores"]) > 0

    # Recalculate with custom weights
    recalc_res = client.post("/api/compliance/recalculate", headers=headers, json={
        "weights": {"attendance": 0.40, "trainer": 0.20, "infrastructure": 0.25, "documentation": 0.15}
    })
    assert recalc_res.status_code == 200

def test_anomaly_management():
    admin_token = test_admin_login()
    headers = {"Authorization": f"Bearer {admin_token}"}
    res = client.get("/api/anomalies", headers=headers)
    assert res.status_code == 200
    anomalies = res.json()
    assert len(anomalies) > 0

    aid = anomalies[0]["id"]
    status_res = client.put(f"/api/anomalies/{aid}/status", headers=headers, json={
        "review_status": "under_review",
        "review_notes": "Investigating with centre coordinator."
    })
    assert status_res.status_code == 200

def test_pdf_report_generation():
    admin_token = test_admin_login()
    headers = {"Authorization": f"Bearer {admin_token}"}
    centres = client.get("/api/centres", headers=headers).json()
    cid = centres[0]["id"]

    res = client.get(f"/api/reports/centre/{cid}", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "download_url" in data

    # Verify downloading the generated PDF
    dl_res = client.get(data["download_url"])
    assert dl_res.status_code == 200
    assert dl_res.headers["content-type"] == "application/pdf"
    assert len(dl_res.content) > 1000
