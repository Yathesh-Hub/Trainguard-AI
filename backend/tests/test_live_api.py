"""Comprehensive live API test against running TrainGuard AI server"""
import requests
import json
import io
import uuid
import sys

BASE = 'http://127.0.0.1:8001/api'
results = []

def test(name, r, detail_fn=None):
    code = r.status_code
    detail = ""
    try:
        if detail_fn:
            detail = detail_fn(r)
        else:
            detail = str(r.json())[:80]
    except:
        detail = r.text[:80]
    results.append((name, code, detail))
    return r

print("\n" + "="*75)
print("  TRAINGUARD AI - COMPREHENSIVE LIVE API TEST")
print("="*75 + "\n")

# 1. Health
r = requests.get(f'{BASE}/health')
test('1. Health Check', r, lambda r: r.json()['status'])

# 2. Root endpoint
r = requests.get('http://127.0.0.1:8001/')
test('2. Root Endpoint', r, lambda r: f"app={r.json()['app']}, version={r.json()['version']}")

# 3. Admin Login
r = requests.post(f'{BASE}/auth/login', json={'email':'admin@trainguard.ai','password':'Password123!'})
test('3. Admin Login', r, lambda r: f"role={r.json()['user']['role']}")
token = r.json()['access_token']
headers = {'Authorization': f'Bearer {token}'}

# 4. Manager Login
r = requests.post(f'{BASE}/auth/login', json={'email':'manager@apex.trainguard.ai','password':'Password123!'})
test('4. Manager Login', r, lambda r: f"role={r.json()['user']['role']}")

# 5. Get Profile
r = requests.get(f'{BASE}/auth/me', headers=headers)
test('5. Get Profile (/auth/me)', r, lambda r: f"role={r.json().get('role','?')}, name={r.json().get('full_name','?')}")

# 6. List Centres
r = requests.get(f'{BASE}/centres', headers=headers)
centres = r.json()
test('6. List Centres', r, lambda r: f"{len(centres)} centres loaded")
centre_id = centres[0]['id'] if centres else None
centre_names = [c['name'] for c in centres]
print(f"     Centres: {', '.join(centre_names)}")

# 7. Centre Detail
if centre_id:
    r = requests.get(f'{BASE}/centres/{centre_id}', headers=headers)
    d = r.json()
    batches_count = len(d.get("batches", []))
    trainers_count = len(d.get("trainers", []))
    test('7. Centre Detail', r, lambda r: f"batches={batches_count}, trainers={trainers_count}")

# 8. List Students
r = requests.get(f'{BASE}/students', headers=headers)
students = r.json()
test('8. List Students', r, lambda r: f"{len(students)} students")

# 9. List Trainers
r = requests.get(f'{BASE}/trainers', headers=headers)
trainers = r.json()
test('9. List Trainers', r, lambda r: f"{len(trainers)} trainers")

# 10. Attendance Records
r = requests.get(f'{BASE}/attendance?limit=10', headers=headers)
test('10. Attendance Records', r, lambda r: f"{len(r.json())} records (limited to 10)")

# 11. Attendance Analytics
r = requests.get(f'{BASE}/attendance/analytics', headers=headers)
analytics = r.json()
test('11. Attendance Analytics', r, lambda r: f"overall={analytics.get('overall_percentage','?')}%, thresholds={analytics.get('threshold_counts','?')}")

# 12. Anomalies List
r = requests.get(f'{BASE}/anomalies', headers=headers)
anomalies = r.json()
test('12. List Anomalies', r, lambda r: f"{len(anomalies)} anomalies")

# 13. Compliance Overview
r = requests.get(f'{BASE}/compliance/overview', headers=headers)
overview = r.json()
test('13. Compliance Overview', r, lambda r: f"avg={overview.get('average_score','?')}, centres={len(overview.get('all_scores',[]))}")

# 14. Centre Compliance
if centre_id:
    r = requests.get(f'{BASE}/compliance/centre/{centre_id}', headers=headers)
    test('14. Centre Compliance', r, lambda r: f"score={r.json().get('overall_score','?')}, category={r.json().get('compliance_category','?')}")

# 15. PDF Report Generation
if centre_id:
    r = requests.get(f'{BASE}/reports/centre/{centre_id}', headers=headers)
    report_data = r.json()
    test('15. PDF Report Gen', r, lambda r: f"url={report_data.get('download_url','?')}")

    # 16. Download the PDF
    dl_url = report_data.get('download_url', '')
    if dl_url:
        r2 = requests.get(f'http://127.0.0.1:8001{dl_url}')
        pdf_size = len(r2.content)
        pdf_type = r2.headers.get('content-type', '?')
        results.append(('16. PDF Download', r2.status_code, f"{pdf_size} bytes, content-type={pdf_type}"))

# 17. Forgot Password
r = requests.post(f'{BASE}/auth/forgot-password', json={'email':'admin@trainguard.ai'})
test('17. Forgot Password', r, lambda r: r.json().get('message','?')[:60])

# 18. CSV Upload
csv_data = b'Student ID,Student Name,Date,Batch,Attendance Status\nSTU-2024-001,Test Student,2024-03-01,BAT-01-01,Present\nSTU-2024-002,Test Student 2,2024-03-01,BAT-01-01,Absent\nSTU-2024-003,Test Student 3,2024-03-01,BAT-01-01,Present\n'
files = {'file': ('test.csv', io.BytesIO(csv_data), 'text/csv')}
data = {'centre_id': centre_id}
r = requests.post(f'{BASE}/attendance/upload', headers={'Authorization': f'Bearer {token}'}, files=files, data=data)
test('18. CSV Attendance Upload', r, lambda r: f"total={r.json().get('total_records','?')}, inserted={r.json().get('inserted_records','?')}")

# 19. Infrastructure Upload (synthetic image with OpenCV)
try:
    import numpy as np
    import cv2
    img = np.full((300, 400, 3), 200, dtype=np.uint8)
    cv2.rectangle(img, (50, 80), (85, 200), (0, 0, 220), -1)  # fire extinguisher (red)
    cv2.rectangle(img, (120, 50), (320, 150), (250, 250, 250), -1)  # whiteboard (white)
    cv2.rectangle(img, (150, 180), (300, 270), (139, 90, 43), -1)  # furniture (brown)
    _, enc = cv2.imencode('.jpg', img)
    files = {'file': ('classroom.jpg', io.BytesIO(enc.tobytes()), 'image/jpeg')}
    data = {'centre_id': centre_id, 'room_name': 'Lab 101', 'remarks': 'Automated test inspection'}
    r = requests.post(f'{BASE}/infrastructure/upload', headers={'Authorization': f'Bearer {token}'}, files=files, data=data)
    findings = r.json().get('findings', [])
    finding_labels = [f['detected_label'] for f in findings]
    test('19. Infrastructure CV Upload', r, lambda r: f"{len(findings)} findings: {finding_labels}")

    # 20. Verify a finding
    if findings:
        fid = findings[0]['id']
        r = requests.post(f'{BASE}/infrastructure/verify/{fid}', headers=headers,
                         json={'verification_status': 'verified', 'inspector_notes': 'Verified by test'})
        test('20. Verify Finding', r, lambda r: f"verified finding {fid[:12]}...")
except ImportError:
    results.append(('19. Infrastructure CV Upload', 0, 'SKIPPED - OpenCV not installed'))

# 21. Compliance Recalculate
r = requests.post(f'{BASE}/compliance/recalculate', headers=headers,
                  json={'weights': {'attendance': 0.40, 'trainer': 0.20, 'infrastructure': 0.25, 'documentation': 0.15}})
test('21. Compliance Recalculate', r, lambda r: f"{len(r.json().get('results',[]))} centres recalculated")

# 22. Anomaly Status Update
if anomalies:
    aid = anomalies[0]['id']
    r = requests.put(f'{BASE}/anomalies/{aid}/status', headers=headers,
                    json={'review_status': 'under_review', 'review_notes': 'Investigating - automated test'})
    test('22. Anomaly Status Update', r, lambda r: "status updated")

# 23. Register new user
test_email = f'testuser_{uuid.uuid4().hex[:6]}@test.com'
r = requests.post(f'{BASE}/auth/register', json={
    'email': test_email, 'password': 'TestPass123!',
    'full_name': 'Test User', 'role': 'centre_manager',
    'centre_id': centre_id, 'phone': '+91 99999 00001'
})
test('23. User Registration', r, lambda r: f"registered {test_email}")

# 24. Login as new user
r = requests.post(f'{BASE}/auth/login', json={'email': test_email, 'password': 'TestPass123!'})
test('24. New User Login', r, lambda r: f"role={r.json()['user']['role']}")

# 25. Test frontend proxy
r = requests.get('http://127.0.0.1:5173/api/health')
test('25. Frontend Proxy (/api)', r, lambda r: f"proxied to backend OK: {r.json()['status']}")

# Print final results
print("\n" + "="*75)
print("  RESULTS SUMMARY")
print("="*75)
passed = 0
failed = 0
for name, code, detail in results:
    if 200 <= code <= 201:
        status = '\u2705 PASS'
        passed += 1
    else:
        status = '\u274c FAIL'
        failed += 1
    print(f"  {status}  [{code}]  {name}")
    print(f"           {detail}")
print("="*75)
print(f"\n  TOTAL: {passed + failed} tests  |  \u2705 {passed} passed  |  \u274c {failed} failed")
if failed == 0:
    print("\n  \U0001f389 ALL TESTS PASSED! TrainGuard AI is fully operational.")
print("="*75 + "\n")
