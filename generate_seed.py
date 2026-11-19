"""
Script to generate database/seed.sql and sample files in sample_data/
"""
import uuid
import json
import random
from datetime import date, timedelta
import os
import openpyxl

os.makedirs('database', exist_ok=True)
os.makedirs('sample_data', exist_ok=True)

# Deterministic UUID generator based on namespace
NAMESPACE = uuid.UUID('12345678-1234-5678-1234-567812345678')
def get_uuid(name: str) -> str:
    return str(uuid.uuid5(NAMESPACE, name))

sql_lines = [
    "-- TrainGuard AI: Comprehensive Demonstration Seed Data",
    "-- Includes 5 Centres, 10 Batches, 15 Trainers, 100 Students, 30 Days of Attendance, Infra Findings, and Anomalies",
    "",
    "-- Ensure extensions are loaded",
    "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";",
    ""
]

# 1. Centres
centres_data = [
    ("tc_1", "TC-101", "Apex Skill Academy", "42 MG Road, Residency Area", "Bengaluru Urban", "Karnataka", "Dr. Rajesh Kumar", "+91 98450 12345", "contact@apexskill.org", 150, "2021-06-15", "active"),
    ("tc_2", "TC-102", "Horizon Technical Institute", "15 Saraswathipuram Main", "Mysuru", "Karnataka", "Sunita Sharma", "+91 98230 45678", "info@horizontech.edu", 120, "2022-01-10", "active"),
    ("tc_3", "TC-103", "Pioneer Vocational Centre", "88 Station Road, Vidyanagar", "Hubballi", "Karnataka", "Anand Patil", "+91 94480 67890", "pioneer.voc@gmail.com", 100, "2022-08-20", "under_review"),
    ("tc_4", "TC-104", "Zenith Digital Training Hub", "10 Hampankatta Circle", "Mangaluru", "Karnataka", "Priya Shetty", "+91 97410 98765", "admin@zenithdigital.in", 160, "2020-11-05", "active"),
    ("tc_5", "TC-105", "Radiant Career Institute", "23 Khanapur Road, Tilakwadi", "Belagavi", "Karnataka", "Mahesh Kulkarni", "+91 99001 23456", "reach@radiantcareer.com", 90, "2023-03-12", "active")
]

sql_lines.append("-- 1. Insert Training Centres")
sql_lines.append("INSERT INTO training_centres (id, centre_code, name, address, district, state, contact_person, phone, email, total_capacity, establishment_date, status) VALUES")
centre_values = []
for c_key, code, name, addr, dist, st, contact, phone, email, cap, est, status in centres_data:
    cid = get_uuid(c_key)
    centre_values.append(f"('{cid}', '{code}', '{name}', '{addr}', '{dist}', '{st}', '{contact}', '{phone}', '{email}', {cap}, '{est}', '{status}')")
sql_lines.append(",\n".join(centre_values) + ";\n")

# 2. Profiles (Admin & Centre Managers)
sql_lines.append("-- 2. Insert Profiles")
admin_uid = get_uuid("user_admin")
manager_uid = get_uuid("user_manager_1")
profiles_data = [
    (admin_uid, "admin@trainguard.ai", "System Administrator", "admin", None, "+91 98000 00001"),
    (manager_uid, "manager@apex.trainguard.ai", "Rajesh Kumar (Apex)", "centre_manager", get_uuid("tc_1"), "+91 98450 12345"),
    (get_uuid("user_manager_2"), "manager@horizon.trainguard.ai", "Sunita Sharma (Horizon)", "centre_manager", get_uuid("tc_2"), "+91 98230 45678"),
    (get_uuid("user_manager_3"), "manager@pioneer.trainguard.ai", "Anand Patil (Pioneer)", "centre_manager", get_uuid("tc_3"), "+91 94480 67890"),
    (get_uuid("user_manager_4"), "manager@zenith.trainguard.ai", "Priya Shetty (Zenith)", "centre_manager", get_uuid("tc_4"), "+91 97410 98765"),
    (get_uuid("user_manager_5"), "manager@radiant.trainguard.ai", "Mahesh Kulkarni (Radiant)", "centre_manager", get_uuid("tc_5"), "+91 99001 23456"),
]
sql_lines.append("INSERT INTO profiles (id, email, full_name, role, centre_id, phone, is_active) VALUES")
profile_vals = []
for uid, email, fname, role, cid_val, ph in profiles_data:
    cid_str = f"'{cid_val}'" if cid_val else "NULL"
    profile_vals.append(f"('{uid}', '{email}', '{fname}', '{role}', {cid_str}, '{ph}', true)")
sql_lines.append(",\n".join(profile_vals) + ";\n")

# 3. Batches
sql_lines.append("-- 3. Insert Batches (2 per centre)")
courses = [
    ("BAT-CS-01", "Full Stack Web Development", "09:00 AM - 01:00 PM"),
    ("BAT-DA-01", "Data Analytics & Python", "02:00 PM - 06:00 PM")
]
batch_keys = []
batch_vals = []
batch_idx = 1
for c_idx in range(1, 6):
    cid = get_uuid(f"tc_{c_idx}")
    for b_offset in range(2):
        b_key = f"batch_{batch_idx}"
        bid = get_uuid(b_key)
        batch_keys.append((b_key, bid, cid))
        code = f"BAT-{c_idx:02d}-{b_offset+1:02d}"
        course = courses[b_offset][1]
        timing = courses[b_offset][2]
        batch_vals.append(f"('{bid}', '{code}', '{cid}', '{course}', '2024-01-10', '2024-06-30', '{timing}', 'ongoing')")
        batch_idx += 1
sql_lines.append("INSERT INTO batches (id, batch_code, centre_id, course_name, start_date, end_date, timing, status) VALUES")
sql_lines.append(",\n".join(batch_vals) + ";\n")

# 4. Trainers
sql_lines.append("-- 4. Insert Trainers (3 per centre = 15 total)")
trainer_names = [
    ("Arun Verma", "Verma.a@example.com", "Full Stack Web", "+91 98111 00001"),
    ("Sneha Kulkarni", "sneha.k@example.com", "Data Analytics & Python", "+91 98111 00002"),
    ("Rohan Deshmukh", "rohan.d@example.com", "Cloud Computing & DevOps", "+91 98111 00003"),
    ("Deepak Gowda", "deepak.g@example.com", "Cybersecurity Basics", "+91 98111 00004"),
    ("Kavita Rao", "kavita.r@example.com", "UI/UX & Frontend", "+91 98111 00005"),
    ("Naveen Hegde", "naveen.h@example.com", "Full Stack Web", "+91 98111 00006"),
    ("Meera Nair", "meera.n@example.com", "Data Analytics & Python", "+91 98111 00007"),
    ("Siddharth Joshi", "siddharth.j@example.com", "Python Programming", "+91 98111 00008"),
    ("Pooja Bhat", "pooja.b@example.com", "Web Design", "+91 98111 00009"),
    ("Vikram Singh", "vikram.s@example.com", "Machine Learning Basics", "+91 98111 00010"),
    ("Ganesh Murthy", "ganesh.m@example.com", "Database Systems", "+91 98111 00011"),
    ("Tanvi Salian", "tanvi.s@example.com", "Frontend React", "+91 98111 00012"),
    ("Amitabh Sen", "amitabh.s@example.com", "Python & SQL", "+91 98111 00013"),
    ("Rekha Kamat", "rekha.k@example.com", "Software Testing QA", "+91 98111 00014"),
    ("Harish Nayak", "harish.n@example.com", "Full Stack Web", "+91 98111 00015")
]
trainer_vals = []
trainer_keys = []
for t_idx, (t_name, t_mail, t_sub, t_ph) in enumerate(trainer_names, start=1):
    c_idx = ((t_idx - 1) // 3) + 1
    cid = get_uuid(f"tc_{c_idx}")
    t_key = f"trainer_{t_idx}"
    tid = get_uuid(t_key)
    trainer_keys.append((t_key, tid, cid))
    t_code = f"TRN-{t_idx:03d}"
    b_key_assigned = get_uuid(f"batch_{((c_idx-1)*2) + 1}")
    trainer_vals.append(f"('{tid}', '{t_code}', '{t_name}', '{t_mail}', '{t_ph}', '{t_sub}', '{cid}', '{b_key_assigned}', 'active')")

sql_lines.append("INSERT INTO trainers (id, trainer_id, name, email, phone, subject, assigned_centre_id, assigned_batch_id, employment_status) VALUES")
sql_lines.append(",\n".join(trainer_vals) + ";\n")

# 5. Students (100 students: 20 per centre, 10 per batch)
sql_lines.append("-- 5. Insert Students (100 students)")
first_names = ["Aarav", "Aditi", "Akhil", "Ananya", "Bhavna", "Chirag", "Divya", "Gautam", "Harini", "Ishaan",
               "Karthik", "Lavanya", "Manoj", "Neha", "Pranav", "Radhika", "Sachin", "Tanvi", "Varun", "Yash"]
last_names = ["Sharma", "Verma", "Patil", "Rao", "Hegde", "Bhat", "Desai", "Gowda", "Kulkarni", "Shetty"]

student_keys = []
student_vals = []
stu_idx = 1
for c_idx in range(1, 6):
    cid = get_uuid(f"tc_{c_idx}")
    for b_offset in range(2):
        batch_num = ((c_idx - 1) * 2) + b_offset + 1
        bid = get_uuid(f"batch_{batch_num}")
        course = "Full Stack Web Development" if b_offset == 0 else "Data Analytics & Python"
        for s_in_batch in range(10):
            s_key = f"stu_{stu_idx}"
            sid = get_uuid(s_key)
            fname = f"{first_names[(stu_idx - 1) % len(first_names)]} {last_names[(stu_idx * 3) % len(last_names)]}"
            code = f"STU-2024-{stu_idx:03d}"
            mail = f"student{stu_idx}@example.org"
            phone = f"+91 97000 {stu_idx:05d}"
            student_keys.append((s_key, sid, cid, bid, code, fname))
            student_vals.append(f"('{sid}', '{code}', '{fname}', '{mail}', '{phone}', '{course}', '{bid}', '{cid}', '2024-01-15', 'active')")
            stu_idx += 1

sql_lines.append("INSERT INTO students (id, student_id, full_name, email, phone, course, batch_id, centre_id, joining_date, status) VALUES")
sql_lines.append(",\n".join(student_vals) + ";\n")

# 6. Infrastructure Requirements (7 items)
sql_lines.append("-- 6. Insert Infrastructure Requirements")
infra_reqs = [
    ("req_1", "Classroom Furniture", "Facility", "Ergonomic student desks and chairs in good condition", 20, True),
    ("req_2", "Whiteboard", "Equipment", "Clean whiteboard with markers and duster available", 1, True),
    ("req_3", "Projector", "AV Equipment", "Ceiling or table mounted projector with HDMI connectivity", 1, True),
    ("req_4", "Computers", "IT Hardware", "Working desktop or laptop PCs with required OS and IDEs", 15, True),
    ("req_5", "Lighting", "Environment", "Adequate flicker-free LED lighting meeting lux standards", 6, True),
    ("req_6", "Seating Arrangements", "Safety & Ergonomics", "Spacious layout with minimum 1.2m aisle clearance", 1, True),
    ("req_7", "Fire Extinguisher", "Safety", "Valid ABC powder or CO2 extinguisher within expiry date", 1, True)
]
infra_req_vals = []
for r_key, item_name, cat, desc, min_q, mand in infra_reqs:
    rid = get_uuid(r_key)
    infra_req_vals.append(f"('{rid}', '{item_name}', '{cat}', '{desc}', {min_q}, {'true' if mand else 'false'})")
sql_lines.append("INSERT INTO infrastructure_requirements (id, item_name, category, description, minimum_quantity, is_mandatory) VALUES")
sql_lines.append(",\n".join(infra_req_vals) + ";\n")

# 7. Sample Inspections & Findings
sql_lines.append("-- 7. Insert Infrastructure Inspections & Findings")
inspections_data = [
    ("insp_1", get_uuid("tc_1"), "Lab 101 - Main Computing Lab", "infrastructure/tc1_lab101.jpg", "compliant", "All required equipment present and in good condition."),
    ("insp_2", get_uuid("tc_2"), "Room 202 - Theory Classroom", "infrastructure/tc2_room202.jpg", "compliant", "Clear layout, functional projector and whiteboard."),
    ("insp_3", get_uuid("tc_3"), "Workshop B - Software Testing", "infrastructure/tc3_workshopB.jpg", "partial", "Missing fire extinguisher tag check; 3 PCs need maintenance."),
    ("insp_4", get_uuid("tc_4"), "Smart Lab 01", "infrastructure/tc4_smartlab01.jpg", "compliant", "State of the art setup, high lumen projector, clean desks."),
    ("insp_5", get_uuid("tc_5"), "Classroom 3 - IT Foundation", "infrastructure/tc5_class3.jpg", "non_compliant", "Insufficient lighting fixtures; projector cables damaged.")
]
insp_vals = []
for ins_key, cid, room, img, status, remarks in inspections_data:
    ins_id = get_uuid(ins_key)
    insp_vals.append(f"('{ins_id}', '{cid}', '{admin_uid}', '2024-02-15', '{room}', '{img}', '{status}', '{remarks}')")
sql_lines.append("INSERT INTO infrastructure_inspections (id, centre_id, inspector_id, inspection_date, room_name, image_path, overall_compliance_status, remarks) VALUES")
sql_lines.append(",\n".join(insp_vals) + ";\n")

findings_data = [
    (get_uuid("insp_1"), get_uuid("req_4"), "Computers", 0.9420, '{"x1": 50, "y1": 100, "x2": 450, "y2": 380, "count": 22}', True, True, "verified", "22 operational terminals verified."),
    (get_uuid("insp_1"), get_uuid("req_3"), "Projector", 0.8850, '{"x1": 200, "y1": 10, "x2": 320, "y2": 80}', True, True, "verified", "Ceiling projector tested working."),
    (get_uuid("insp_1"), get_uuid("req_7"), "Fire Extinguisher", 0.9100, '{"x1": 580, "y1": 200, "x2": 630, "y2": 350}', True, True, "verified", "Valid inspection tag dated Jan 2024."),
    (get_uuid("insp_2"), get_uuid("req_2"), "Whiteboard", 0.9650, '{"x1": 150, "y1": 80, "x2": 480, "y2": 260}', True, True, "verified", "Standard size magnetic whiteboard."),
    (get_uuid("insp_3"), get_uuid("req_7"), "Fire Extinguisher", 0.4200, '{"x1": 0, "y1": 0, "x2": 0, "y2": 0}', False, False, "pending", "Potential missing extinguisher; requires physical audit."),
    (get_uuid("insp_5"), get_uuid("req_5"), "Lighting", 0.5200, '{"lux_measured": 180, "standard": 300}', True, True, "verified", "Lux measurement below standard (180 vs 300 target).")
]
finding_vals = []
for insp_id, req_id, label, conf, bbox, ai_det, h_ver, v_stat, notes in findings_data:
    fid = str(uuid.uuid4())
    finding_vals.append(f"('{fid}', '{insp_id}', '{req_id}', '{label}', {conf}, '{bbox}'::jsonb, {'true' if ai_det else 'false'}, {'true' if h_ver else 'false'}, '{v_stat}', '{notes}')")
sql_lines.append("INSERT INTO infrastructure_findings (id, inspection_id, requirement_id, detected_label, confidence_score, bounding_box, ai_detected, human_verified, verification_status, inspector_notes) VALUES")
sql_lines.append(",\n".join(finding_vals) + ";\n")

# 8. Anomaly Records
sql_lines.append("-- 8. Insert Anomaly Records")
anomalies_data = [
    (get_uuid("tc_3"), "attendance_drop", "Sudden 38% attendance drop observed in Batch BAT-03-01 on Feb 12th compared to moving average", "high", "2024-02-12", '{"batch": "BAT-03-01", "normal_rate": 88.5, "day_rate": 50.5, "variance": -38.0}', "open", "Investigating potential local festival or unreported transport interruption."),
    (get_uuid("tc_5"), "identical_patterns", "Repeated identical attendance pattern: 18 students marked present at exact identical timestamps over 5 consecutive days", "critical", "2024-02-14", '{"pattern_length_days": 5, "matching_students": 18, "similarity_index": 1.0}', "under_review", "Evidence indicates possible bulk attendance copy-paste without physical verification."),
    (get_uuid("tc_2"), "trainer_discrepancy", "Trainer Deepak Gowda marked present for 4h session but zero student attendance logged for BAT-02-02", "medium", "2024-02-10", '{"trainer_id": "TRN-004", "session_hours": 4.0, "student_logs_count": 0}', "resolved", "Trainer conducted makeup lecture; attendance sheet uploaded under delayed sync."),
    (get_uuid("tc_1"), "duplicate_records", "12 student attendance records submitted with identical biometric hash on 2024-01-22", "low", "2024-01-22", '{"duplicate_count": 12}', "false_positive", "Scanner software glitch re-sent duplicate batch packet; cleared.")
]
anomaly_vals = []
for cid, cat, desc, sev, a_date, ev_json, r_stat, r_notes in anomalies_data:
    aid = str(uuid.uuid4())
    anomaly_vals.append(f"('{aid}', '{cid}', '{cat}', '{desc}', '{sev}', '{a_date}', '{ev_json}'::jsonb, '{r_stat}', '{admin_uid}', '{r_notes}')")
sql_lines.append("INSERT INTO anomaly_records (id, centre_id, category, description, severity, anomaly_date, evidence, review_status, reviewed_by, review_notes) VALUES")
sql_lines.append(",\n".join(anomaly_vals) + ";\n")

# 9. Compliance Scores (Historical and current for all 5 centres)
sql_lines.append("-- 9. Insert Compliance Scores")
scores_data = [
    (get_uuid("tc_1"), 93.50, 95.0, 92.0, 94.0, 91.0, 100.0, "excellent", 91.0, '["Maintain excellent biometric recording", "Schedule quarterly projector bulb servicing"]'),
    (get_uuid("tc_2"), 84.75, 86.0, 85.0, 82.0, 87.0, 100.0, "good", 82.5, '["Improve student attendance in BAT-02-02", "Conduct mock fire drill"]'),
    (get_uuid("tc_3"), 68.20, 62.0, 75.0, 65.0, 80.0, 95.0, "needs_improvement", 72.0, '["Resolve sudden attendance drops in BAT-03-01", "Inspect 3 faulty computer units"]'),
    (get_uuid("tc_4"), 95.80, 97.0, 96.0, 95.0, 94.0, 100.0, "excellent", 94.2, '["Benchmarked as top performing regional centre", "Offer peer mentorship to TC-103"]'),
    (get_uuid("tc_5"), 56.40, 52.0, 60.0, 58.0, 62.0, 90.0, "critical", 61.5, '["Urgent audit: bulk identical attendance patterns detected", "Upgrade classroom lighting to 300 lux"]')
]
score_vals = []
for cid, overall, att, trn, inf, doc, cov, cat, prev, recs in scores_data:
    scid = str(uuid.uuid4())
    weights = '{"attendance": 0.35, "trainer": 0.20, "infrastructure": 0.30, "documentation": 0.15}'
    score_vals.append(f"('{scid}', '{cid}', '2024-02-18', {overall}, {att}, {trn}, {inf}, {doc}, '{weights}'::jsonb, {cov}, '{cat}', '{recs}'::jsonb, {prev})")
sql_lines.append("INSERT INTO compliance_scores (id, centre_id, calculation_date, overall_score, attendance_score, trainer_score, infrastructure_score, documentation_score, weights_used, evidence_coverage_percentage, compliance_category, recommendations, previous_score) VALUES")
sql_lines.append(",\n".join(score_vals) + ";\n")

# 10. Attendance Records (30 days for 100 students)
# Dates: 2024-01-15 to 2024-02-13 (30 days, skip Sundays)
sql_lines.append("-- 10. Insert Attendance Records (30 days)")
start_dt = date(2024, 1, 15)
dates = []
curr = start_dt
while len(dates) < 25: # 25 class days
    if curr.weekday() != 6: # skip Sunday
        dates.append(curr)
    curr += timedelta(days=1)

att_vals = []
random.seed(42)

for s_key, sid, cid, bid, scode, sname in student_keys:
    # Determine base attendance tendency depending on centre
    # tc_1: 95%, tc_2: 85%, tc_3: 65%, tc_4: 96%, tc_5: 55%
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
            status = 'present'
        elif roll < base_p + 0.05:
            status = 'late'
        elif roll < base_p + 0.08:
            status = 'excused'
        else:
            status = 'absent'
        
        aid = str(uuid.uuid4())
        att_vals.append(f"('{aid}', '{sid}', '{bid}', '{cid}', '{d.isoformat()}', '{status}')")

# Chunk attendance inserts to avoid mega-statements
CHUNK_SIZE = 250
sql_lines.append("INSERT INTO attendance_records (id, student_id, batch_id, centre_id, date, status) VALUES")
for i in range(0, len(att_vals), CHUNK_SIZE):
    chunk = att_vals[i:i+CHUNK_SIZE]
    if i > 0:
        sql_lines.append("INSERT INTO attendance_records (id, student_id, batch_id, centre_id, date, status) VALUES")
    sql_lines.append(",\n".join(chunk) + ";\n")

# 11. Trainer Attendance (25 class days for 15 trainers)
sql_lines.append("-- 11. Insert Trainer Attendance Records")
tr_att_vals = []
for t_key, tid, cid in trainer_keys:
    for d in dates:
        roll = random.random()
        if roll < 0.92:
            status = 'present'
            hours = 4.0
        elif roll < 0.96:
            status = 'half_day'
            hours = 2.0
        else:
            status = 'on_leave'
            hours = 0.0
        taid = str(uuid.uuid4())
        tr_att_vals.append(f"('{taid}', '{tid}', '{cid}', '{d.isoformat()}', '{status}', {hours})")

for i in range(0, len(tr_att_vals), CHUNK_SIZE):
    chunk = tr_att_vals[i:i+CHUNK_SIZE]
    if i > 0:
        sql_lines.append("INSERT INTO trainer_attendance (id, trainer_id, centre_id, date, status, session_hours) VALUES")
    sql_lines.append(",\n".join(chunk) + ";\n")

# 12. Audit Logs
sql_lines.append("-- 12. Insert Audit Logs")
audit_vals = [
    f"('{str(uuid.uuid4())}', '{admin_uid}', '{get_uuid('tc_1')}', 'CENTRE_CREATED', 'training_centres', '{get_uuid('tc_1')}', '{{\"name\": \"Apex Skill Academy\"}}'::jsonb, '127.0.0.1')",
    f"('{str(uuid.uuid4())}', '{admin_uid}', '{get_uuid('tc_1')}', 'ATTENDANCE_BATCH_UPLOAD', 'attendance_records', 'BAT-01-01', '{{\"records_processed\": 250, \"status\": \"success\"}}'::jsonb, '127.0.0.1')",
    f"('{str(uuid.uuid4())}', '{admin_uid}', '{get_uuid('tc_3')}', 'ANOMALY_FLAGGED', 'anomaly_records', 'ATT-DROP', '{{\"severity\": \"high\"}}'::jsonb, '127.0.0.1')",
    f"('{str(uuid.uuid4())}', '{admin_uid}', '{get_uuid('tc_4')}', 'COMPLIANCE_EVALUATION', 'compliance_scores', '{get_uuid('tc_4')}', '{{\"score\": 95.8}}'::jsonb, '127.0.0.1')"
]
sql_lines.append("INSERT INTO audit_logs (id, user_id, centre_id, action, entity_type, entity_id, details, ip_address) VALUES")
sql_lines.append(",\n".join(audit_vals) + ";\n")

# Write to database/seed.sql
with open('database/seed.sql', 'w', encoding='utf-8') as f:
    f.write("\n".join(sql_lines))

print(f"Generated database/seed.sql successfully! Total student records: {len(att_vals)}, Trainer records: {len(tr_att_vals)}")

# Generate Sample CSV & XLSX files in sample_data/
import csv

# 1. Sample Attendance CSV
csv_path = 'sample_data/attendance_sample.csv'
with open(csv_path, 'w', newline='', encoding='utf-8') as f:
    writer = csv.writer(f)
    writer.writerow(["Student ID", "Student Name", "Date", "Batch", "Attendance Status"])
    # Pick 20 students from TC-101 BAT-01-01 for 3 days
    for s_key, sid, cid, bid, scode, sname in student_keys[:10]:
        for d in [date(2024, 2, 19), date(2024, 2, 20), date(2024, 2, 21)]:
            status = "Present" if random.random() > 0.1 else "Absent"
            writer.writerow([scode, sname, d.isoformat(), "BAT-01-01", status])

print(f"Generated {csv_path}")

# 2. Sample Attendance Excel (.xlsx)
wb = openpyxl.Workbook()
ws = wb.active
ws.title = "Attendance"
ws.append(["Student ID", "Student Name", "Date", "Batch", "Attendance Status"])
for s_key, sid, cid, bid, scode, sname in student_keys[:10]:
    for d in [date(2024, 2, 19), date(2024, 2, 20), date(2024, 2, 21)]:
        status = "Present" if random.random() > 0.1 else "Absent"
        ws.append([scode, sname, d.isoformat(), "BAT-01-01", status])
wb.save('sample_data/attendance_sample.xlsx')
print("Generated sample_data/attendance_sample.xlsx")

# 3. Sample Students Import CSV
with open('sample_data/students_import_sample.csv', 'w', newline='', encoding='utf-8') as f:
    writer = csv.writer(f)
    writer.writerow(["Student ID", "Full Name", "Email", "Phone", "Course", "Batch Code", "Joining Date"])
    for i in range(1, 16):
        writer.writerow([
            f"STU-NEW-{i:03d}",
            f"New Student {i}",
            f"newstudent{i}@example.com",
            f"+91 99880 {i:05d}",
            "Full Stack Web Development",
            "BAT-01-01",
            "2024-02-01"
        ])
print("Generated sample_data/students_import_sample.csv")
