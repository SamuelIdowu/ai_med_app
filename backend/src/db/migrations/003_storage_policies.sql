-- backend/src/db/migrations/003_storage_policies.sql
-- Sprint 2: Private Medical S3 Storage Bucket & Policies

-- Ensure storage bucket 'medical-images' exists and is private
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'medical-images',
    'medical-images',
    false, -- Private bucket: access requires signed URLs or authentication
    10485760, -- 10MB limit per image
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic'];

-- Storage policies for medical-images
-- 1. Users can upload their own wound photos into their own folder (auth.uid()/*)
DROP POLICY IF EXISTS "Users can upload own medical images" ON storage.objects;
CREATE POLICY "Users can upload own medical images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'medical-images' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- 2. Users can view/read their own wound photos
DROP POLICY IF EXISTS "Users can view own medical images" ON storage.objects;
CREATE POLICY "Users can view own medical images"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'medical-images' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- 3. Users can delete their own wound photos
DROP POLICY IF EXISTS "Users can delete own medical images" ON storage.objects;
CREATE POLICY "Users can delete own medical images"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'medical-images' AND
    (storage.foldername(name))[1] = auth.uid()::text
);
