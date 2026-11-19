-- TrainGuard AI: Primary Database Schema
-- Supabase PostgreSQL Engine compatible with Row Level Security and UUID v4

-- 1. Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Clean-up if needed (for fresh setup)
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS uploaded_documents CASCADE;
DROP TABLE IF EXISTS compliance_scores CASCADE;
DROP TABLE IF EXISTS anomaly_records CASCADE;
DROP TABLE IF EXISTS infrastructure_findings CASCADE;
DROP TABLE IF EXISTS infrastructure_inspections CASCADE;
DROP TABLE IF EXISTS infrastructure_requirements CASCADE;
DROP TABLE IF EXISTS training_sessions CASCADE;
DROP TABLE IF EXISTS trainer_attendance CASCADE;
DROP TABLE IF EXISTS attendance_records CASCADE;
DROP TABLE IF EXISTS trainers CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS batches CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS training_centres CASCADE;

-- 2. Training Centres Table
CREATE TABLE training_centres (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    centre_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    district VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    contact_person VARCHAR(150) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    email VARCHAR(255) NOT NULL,
    total_capacity INTEGER DEFAULT 100 CHECK (total_capacity >= 0),
    establishment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'under_review', 'suspended')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Profiles Table (Linked to auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY, -- Must match auth.users.id
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'centre_manager' CHECK (role IN ('admin', 'centre_manager')),
    centre_id UUID REFERENCES training_centres(id) ON DELETE SET NULL,
    phone VARCHAR(30),
    avatar_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Batches Table
CREATE TABLE batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_code VARCHAR(50) UNIQUE NOT NULL,
    centre_id UUID NOT NULL REFERENCES training_centres(id) ON DELETE CASCADE,
    course_name VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    timing VARCHAR(100) DEFAULT '09:00 AM - 01:00 PM',
    status VARCHAR(50) NOT NULL DEFAULT 'ongoing' CHECK (status IN ('ongoing', 'completed', 'upcoming')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_batch_dates CHECK (end_date >= start_date)
);

-- 5. Students Table
CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(30),
    course VARCHAR(255) NOT NULL,
    batch_id UUID REFERENCES batches(id) ON DELETE SET NULL,
    centre_id UUID NOT NULL REFERENCES training_centres(id) ON DELETE CASCADE,
    joining_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'dropped', 'suspended')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Trainers Table
CREATE TABLE trainers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trainer_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    assigned_centre_id UUID NOT NULL REFERENCES training_centres(id) ON DELETE CASCADE,
    assigned_batch_id UUID REFERENCES batches(id) ON DELETE SET NULL,
    employment_status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (employment_status IN ('active', 'on_leave', 'terminated')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Uploaded Documents Table (referenced by attendance and inspections)
CREATE TABLE uploaded_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    centre_id UUID NOT NULL REFERENCES training_centres(id) ON DELETE CASCADE,
    uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    file_size_bytes BIGINT NOT NULL CHECK (file_size_bytes >= 0),
    storage_bucket VARCHAR(100) NOT NULL,
    storage_path TEXT NOT NULL,
    document_category VARCHAR(50) NOT NULL CHECK (document_category IN ('attendance', 'infrastructure', 'report', 'syllabus', 'other')),
    processing_status VARCHAR(50) NOT NULL DEFAULT 'completed' CHECK (processing_status IN ('uploaded', 'processing', 'completed', 'failed')),
    meta_info JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Attendance Records Table
CREATE TABLE attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    batch_id UUID REFERENCES batches(id) ON DELETE CASCADE,
    centre_id UUID NOT NULL REFERENCES training_centres(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status VARCHAR(30) NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
    remarks TEXT,
    uploaded_document_id UUID REFERENCES uploaded_documents(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_student_attendance_date UNIQUE (student_id, date)
);

-- 9. Trainer Attendance Table
CREATE TABLE trainer_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trainer_id UUID NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
    centre_id UUID NOT NULL REFERENCES training_centres(id) ON DELETE CASCADE,
    batch_id UUID REFERENCES batches(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    status VARCHAR(30) NOT NULL CHECK (status IN ('present', 'absent', 'on_leave', 'half_day')),
    session_hours NUMERIC(4, 2) NOT NULL DEFAULT 0.0 CHECK (session_hours >= 0 AND session_hours <= 24),
    remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_trainer_attendance_date UNIQUE (trainer_id, date)
);

-- 10. Training Sessions Table
CREATE TABLE training_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    centre_id UUID NOT NULL REFERENCES training_centres(id) ON DELETE CASCADE,
    trainer_id UUID REFERENCES trainers(id) ON DELETE SET NULL,
    scheduled_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    topic VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'rescheduled')),
    actual_conducted_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Infrastructure Requirements Configuration Table
CREATE TABLE infrastructure_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_name VARCHAR(150) UNIQUE NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    minimum_quantity INTEGER NOT NULL DEFAULT 1 CHECK (minimum_quantity > 0),
    is_mandatory BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. Infrastructure Inspections Table
CREATE TABLE infrastructure_inspections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    centre_id UUID NOT NULL REFERENCES training_centres(id) ON DELETE CASCADE,
    inspector_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    inspection_date DATE NOT NULL DEFAULT CURRENT_DATE,
    room_name VARCHAR(150) NOT NULL,
    image_path TEXT NOT NULL,
    image_signed_url TEXT,
    overall_compliance_status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (overall_compliance_status IN ('compliant', 'partial', 'non_compliant', 'pending')),
    remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. Infrastructure Findings Table
CREATE TABLE infrastructure_findings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inspection_id UUID NOT NULL REFERENCES infrastructure_inspections(id) ON DELETE CASCADE,
    requirement_id UUID REFERENCES infrastructure_requirements(id) ON DELETE SET NULL,
    detected_label VARCHAR(150) NOT NULL,
    confidence_score NUMERIC(5, 4) CHECK (confidence_score >= 0 AND confidence_score <= 1.0),
    bounding_box JSONB DEFAULT '{}'::jsonb,
    ai_detected BOOLEAN NOT NULL DEFAULT TRUE,
    human_verified BOOLEAN NOT NULL DEFAULT FALSE,
    verification_status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('verified', 'rejected', 'pending', 'manual_added')),
    inspector_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. Anomaly Records Table
CREATE TABLE anomaly_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    centre_id UUID NOT NULL REFERENCES training_centres(id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    severity VARCHAR(30) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    anomaly_date DATE NOT NULL,
    evidence JSONB DEFAULT '{}'::jsonb,
    review_status VARCHAR(50) NOT NULL DEFAULT 'open' CHECK (review_status IN ('open', 'under_review', 'resolved', 'false_positive')),
    reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    review_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15. Compliance Scores Table
CREATE TABLE compliance_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    centre_id UUID NOT NULL REFERENCES training_centres(id) ON DELETE CASCADE,
    calculation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    overall_score NUMERIC(5, 2) NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
    attendance_score NUMERIC(5, 2) NOT NULL CHECK (attendance_score >= 0 AND attendance_score <= 100),
    trainer_score NUMERIC(5, 2) NOT NULL CHECK (trainer_score >= 0 AND trainer_score <= 100),
    infrastructure_score NUMERIC(5, 2) NOT NULL CHECK (infrastructure_score >= 0 AND infrastructure_score <= 100),
    documentation_score NUMERIC(5, 2) NOT NULL CHECK (documentation_score >= 0 AND documentation_score <= 100),
    weights_used JSONB NOT NULL DEFAULT '{"attendance": 0.35, "trainer": 0.20, "infrastructure": 0.30, "documentation": 0.15}'::jsonb,
    evidence_coverage_percentage NUMERIC(5, 2) NOT NULL DEFAULT 100.00 CHECK (evidence_coverage_percentage >= 0 AND evidence_coverage_percentage <= 100),
    compliance_category VARCHAR(50) NOT NULL CHECK (compliance_category IN ('excellent', 'good', 'needs_improvement', 'critical')),
    recommendations JSONB DEFAULT '[]'::jsonb,
    previous_score NUMERIC(5, 2) CHECK (previous_score >= 0 AND previous_score <= 100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 16. Audit Logs Table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    centre_id UUID REFERENCES training_centres(id) ON DELETE SET NULL,
    action VARCHAR(150) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100),
    details JSONB DEFAULT '{}'::jsonb,
    ip_address VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for high performance querying
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_centre ON profiles(centre_id);
CREATE INDEX idx_batches_centre ON batches(centre_id);
CREATE INDEX idx_students_centre ON students(centre_id);
CREATE INDEX idx_students_batch ON students(batch_id);
CREATE INDEX idx_students_code ON students(student_id);
CREATE INDEX idx_trainers_centre ON trainers(assigned_centre_id);
CREATE INDEX idx_attendance_date ON attendance_records(date);
CREATE INDEX idx_attendance_centre ON attendance_records(centre_id);
CREATE INDEX idx_attendance_student ON attendance_records(student_id);
CREATE INDEX idx_trainer_attendance_centre ON trainer_attendance(centre_id);
CREATE INDEX idx_trainer_attendance_date ON trainer_attendance(date);
CREATE INDEX idx_anomalies_centre ON anomaly_records(centre_id);
CREATE INDEX idx_anomalies_severity ON anomaly_records(severity);
CREATE INDEX idx_compliance_centre ON compliance_scores(centre_id);
CREATE INDEX idx_compliance_date ON compliance_scores(calculation_date);
CREATE INDEX idx_uploaded_docs_centre ON uploaded_documents(centre_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);

-- Trigger function for updated_at timestamps
CREATE OR REPLACE FUNCTION update_timestamp_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trg_update_profiles BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE PROCEDURE update_timestamp_column();
CREATE TRIGGER trg_update_centres BEFORE UPDATE ON training_centres FOR EACH ROW EXECUTE PROCEDURE update_timestamp_column();
CREATE TRIGGER trg_update_batches BEFORE UPDATE ON batches FOR EACH ROW EXECUTE PROCEDURE update_timestamp_column();
CREATE TRIGGER trg_update_students BEFORE UPDATE ON students FOR EACH ROW EXECUTE PROCEDURE update_timestamp_column();
CREATE TRIGGER trg_update_trainers BEFORE UPDATE ON trainers FOR EACH ROW EXECUTE PROCEDURE update_timestamp_column();
CREATE TRIGGER trg_update_anomalies BEFORE UPDATE ON anomaly_records FOR EACH ROW EXECUTE PROCEDURE update_timestamp_column();

-- Grant permissions to Supabase roles
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO postgres, anon, authenticated, service_role;

