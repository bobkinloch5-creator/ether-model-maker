
-- 1) Add missing UPDATE policy on storage.objects for the models bucket
-- so users can only overwrite files in their own folder.
DROP POLICY IF EXISTS "Users can update their own models" ON storage.objects;
CREATE POLICY "Users can update their own models"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'models' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'models' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 2) Lock down realtime.messages so anonymous users cannot subscribe to
-- arbitrary channel topics. Authenticated users may still subscribe;
-- application code should namespace topics by user/team id.
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated users can read realtime" ON realtime.messages;
CREATE POLICY "authenticated users can read realtime"
  ON realtime.messages
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "authenticated users can write realtime" ON realtime.messages;
CREATE POLICY "authenticated users can write realtime"
  ON realtime.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
