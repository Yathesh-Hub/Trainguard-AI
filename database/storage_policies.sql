-- TrainGuard AI: Supabase Storage Buckets and Policies
-- Establishes private buckets and row-level security for uploaded assets

-- 1. Create Private Storage Buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('attendance-files', 'attendance-files', false, 15728640, ARRAY['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']),
    ('infrastructure-images', 'infrastructure-images', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']),
    ('reports', 'reports', false, 20971520, ARRAY['application/pdf'])
ON CONFLICT (id) DO UPDATE 
SET public = false,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Storage Objects Access Policies

-- Attendance Files Bucket Policy
DROP POLICY IF EXISTS "attendance_files_auth_select" ON storage.objects;
CREATE POLICY "attendance_files_auth_select" ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'attendance-files' AND (
            (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
            OR (storage.foldername(name))[1] = (SELECT centre_id::text FROM profiles WHERE id = auth.uid())
        )
    );

DROP POLICY IF EXISTS "attendance_files_auth_insert" ON storage.objects;
CREATE POLICY "attendance_files_auth_insert" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'attendance-files' AND (
            (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
            OR (storage.foldername(name))[1] = (SELECT centre_id::text FROM profiles WHERE id = auth.uid())
        )
    );

-- Infrastructure Images Bucket Policy
DROP POLICY IF EXISTS "infra_images_auth_select" ON storage.objects;
CREATE POLICY "infra_images_auth_select" ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'infrastructure-images' AND (
            (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
            OR (storage.foldername(name))[1] = (SELECT centre_id::text FROM profiles WHERE id = auth.uid())
        )
    );

DROP POLICY IF EXISTS "infra_images_auth_insert" ON storage.objects;
CREATE POLICY "infra_images_auth_insert" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'infrastructure-images' AND (
            (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
            OR (storage.foldername(name))[1] = (SELECT centre_id::text FROM profiles WHERE id = auth.uid())
        )
    );

-- Reports Bucket Policy
DROP POLICY IF EXISTS "reports_auth_select" ON storage.objects;
CREATE POLICY "reports_auth_select" ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'reports' AND (
            (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
            OR (storage.foldername(name))[1] = (SELECT centre_id::text FROM profiles WHERE id = auth.uid())
        )
    );

DROP POLICY IF EXISTS "reports_auth_insert" ON storage.objects;
CREATE POLICY "reports_auth_insert" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'reports' AND (
            (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
            OR (storage.foldername(name))[1] = (SELECT centre_id::text FROM profiles WHERE id = auth.uid())
        )
    );
