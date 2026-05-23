DROP POLICY IF EXISTS "Authenticated list models" ON storage.objects;

CREATE POLICY "Users list own models"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'models'
  AND (storage.foldername(name))[1] = (auth.uid())::text
);