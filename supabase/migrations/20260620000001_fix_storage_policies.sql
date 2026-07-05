-- Fix country-images INSERT policy to scope uploads to the authenticated user's own path
-- Previously any authenticated user could upload to any path in the country-images bucket

DROP POLICY IF EXISTS "Users can upload country images" ON storage.objects;

CREATE POLICY "Users can upload country images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'country-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
