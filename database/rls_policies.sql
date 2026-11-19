-- TrainGuard AI: Row Level Security (RLS) Policies
-- Enforces role-based isolation between Admins and Centre Managers

-- Helper function to check if the current user is an Admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role = 'admin' AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get the current user's assigned centre_id
CREATE OR REPLACE FUNCTION get_user_centre_id()
RETURNS UUID AS $$
DECLARE
    cid UUID;
BEGIN
    SELECT centre_id INTO cid FROM profiles
    WHERE id = auth.uid() AND is_active = true;
    RETURN cid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_centres ENABLE ROW LEVEL SECURITY;
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainers ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploaded_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainer_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE infrastructure_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE infrastructure_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE infrastructure_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE anomaly_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ========================================================
-- PROFILES POLICIES
-- ========================================================
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
CREATE POLICY "profiles_select_policy" ON profiles
    FOR SELECT TO authenticated
    USING (
        is_admin() OR id = auth.uid() OR centre_id = get_user_centre_id()
    );

DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
CREATE POLICY "profiles_update_policy" ON profiles
    FOR UPDATE TO authenticated
    USING (
        is_admin() OR id = auth.uid()
    )
    WITH CHECK (
        is_admin() OR (id = auth.uid() AND role = (SELECT role FROM profiles WHERE id = auth.uid()))
    );

DROP POLICY IF EXISTS "profiles_admin_all" ON profiles;
CREATE POLICY "profiles_admin_all" ON profiles
    FOR ALL TO authenticated
    USING (is_admin());

-- ========================================================
-- TRAINING CENTRES POLICIES
-- ========================================================
DROP POLICY IF EXISTS "centres_select_policy" ON training_centres;
CREATE POLICY "centres_select_policy" ON training_centres
    FOR SELECT TO authenticated
    USING (
        is_admin() OR id = get_user_centre_id()
    );

DROP POLICY IF EXISTS "centres_admin_modify" ON training_centres;
CREATE POLICY "centres_admin_modify" ON training_centres
    FOR ALL TO authenticated
    USING (is_admin());

-- ========================================================
-- BATCHES POLICIES
-- ========================================================
DROP POLICY IF EXISTS "batches_select_policy" ON batches;
CREATE POLICY "batches_select_policy" ON batches
    FOR SELECT TO authenticated
    USING (
        is_admin() OR centre_id = get_user_centre_id()
    );

DROP POLICY IF EXISTS "batches_manager_modify" ON batches;
CREATE POLICY "batches_manager_modify" ON batches
    FOR ALL TO authenticated
    USING (
        is_admin() OR centre_id = get_user_centre_id()
    );

-- ========================================================
-- STUDENTS POLICIES
-- ========================================================
DROP POLICY IF EXISTS "students_select_policy" ON students;
CREATE POLICY "students_select_policy" ON students
    FOR SELECT TO authenticated
    USING (
        is_admin() OR centre_id = get_user_centre_id()
    );

DROP POLICY IF EXISTS "students_modify_policy" ON students;
CREATE POLICY "students_modify_policy" ON students
    FOR ALL TO authenticated
    USING (
        is_admin() OR centre_id = get_user_centre_id()
    );

-- ========================================================
-- TRAINERS POLICIES
-- ========================================================
DROP POLICY IF EXISTS "trainers_select_policy" ON trainers;
CREATE POLICY "trainers_select_policy" ON trainers
    FOR SELECT TO authenticated
    USING (
        is_admin() OR assigned_centre_id = get_user_centre_id()
    );

DROP POLICY IF EXISTS "trainers_modify_policy" ON trainers;
CREATE POLICY "trainers_modify_policy" ON trainers
    FOR ALL TO authenticated
    USING (
        is_admin() OR assigned_centre_id = get_user_centre_id()
    );

-- ========================================================
-- ATTENDANCE RECORDS POLICIES
-- ========================================================
DROP POLICY IF EXISTS "attendance_select_policy" ON attendance_records;
CREATE POLICY "attendance_select_policy" ON attendance_records
    FOR SELECT TO authenticated
    USING (
        is_admin() OR centre_id = get_user_centre_id()
    );

DROP POLICY IF EXISTS "attendance_modify_policy" ON attendance_records;
CREATE POLICY "attendance_modify_policy" ON attendance_records
    FOR ALL TO authenticated
    USING (
        is_admin() OR centre_id = get_user_centre_id()
    );

-- ========================================================
-- TRAINER ATTENDANCE & SESSIONS POLICIES
-- ========================================================
DROP POLICY IF EXISTS "trainer_att_policy" ON trainer_attendance;
CREATE POLICY "trainer_att_policy" ON trainer_attendance
    FOR ALL TO authenticated
    USING (
        is_admin() OR centre_id = get_user_centre_id()
    );

DROP POLICY IF EXISTS "sessions_policy" ON training_sessions;
CREATE POLICY "sessions_policy" ON training_sessions
    FOR ALL TO authenticated
    USING (
        is_admin() OR centre_id = get_user_centre_id()
    );

-- ========================================================
-- INFRASTRUCTURE POLICIES
-- ========================================================
DROP POLICY IF EXISTS "infra_reqs_select" ON infrastructure_requirements;
CREATE POLICY "infra_reqs_select" ON infrastructure_requirements
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS "infra_reqs_admin" ON infrastructure_requirements;
CREATE POLICY "infra_reqs_admin" ON infrastructure_requirements
    FOR ALL TO authenticated
    USING (is_admin());

DROP POLICY IF EXISTS "infra_inspections_policy" ON infrastructure_inspections;
CREATE POLICY "infra_inspections_policy" ON infrastructure_inspections
    FOR ALL TO authenticated
    USING (
        is_admin() OR centre_id = get_user_centre_id()
    );

DROP POLICY IF EXISTS "infra_findings_policy" ON infrastructure_findings;
CREATE POLICY "infra_findings_policy" ON infrastructure_findings
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM infrastructure_inspections i
            WHERE i.id = infrastructure_findings.inspection_id
            AND (is_admin() OR i.centre_id = get_user_centre_id())
        )
    );

-- ========================================================
-- ANOMALIES & COMPLIANCE POLICIES
-- ========================================================
DROP POLICY IF EXISTS "anomalies_policy" ON anomaly_records;
CREATE POLICY "anomalies_policy" ON anomaly_records
    FOR ALL TO authenticated
    USING (
        is_admin() OR centre_id = get_user_centre_id()
    );

DROP POLICY IF EXISTS "compliance_policy" ON compliance_scores;
CREATE POLICY "compliance_policy" ON compliance_scores
    FOR ALL TO authenticated
    USING (
        is_admin() OR centre_id = get_user_centre_id()
    );

-- ========================================================
-- UPLOADED DOCUMENTS & AUDIT LOGS
-- ========================================================
DROP POLICY IF EXISTS "documents_policy" ON uploaded_documents;
CREATE POLICY "documents_policy" ON uploaded_documents
    FOR ALL TO authenticated
    USING (
        is_admin() OR centre_id = get_user_centre_id()
    );

DROP POLICY IF EXISTS "audit_logs_select" ON audit_logs;
CREATE POLICY "audit_logs_select" ON audit_logs
    FOR SELECT TO authenticated
    USING (
        is_admin() OR centre_id = get_user_centre_id()
    );

DROP POLICY IF EXISTS "audit_logs_insert" ON audit_logs;
CREATE POLICY "audit_logs_insert" ON audit_logs
    FOR INSERT TO authenticated
    WITH CHECK (true);
