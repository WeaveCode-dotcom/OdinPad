-- Public bucket for novel cover JPEGs; object paths are user-scoped: {user_id}/{novel_id}/cover.jpg

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'novel-covers',
  'novel-covers',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "novel_covers_select" ON storage.objects;
CREATE POLICY "novel_covers_select"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'novel-covers');

DROP POLICY IF EXISTS "novel_covers_insert" ON storage.objects;
CREATE POLICY "novel_covers_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'novel-covers'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "novel_covers_update" ON storage.objects;
CREATE POLICY "novel_covers_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'novel-covers'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "novel_covers_delete" ON storage.objects;
CREATE POLICY "novel_covers_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'novel-covers'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
