-- Create a public storage bucket for country images
INSERT INTO storage.buckets (id, name, public)
VALUES ('country-images', 'country-images', true);

-- Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'country-images');

-- Allow authenticated users to update their own uploads
CREATE POLICY "Users can update their own images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'country-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow authenticated users to delete their own uploads
CREATE POLICY "Users can delete their own images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'country-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow public read access
CREATE POLICY "Public read access to images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'country-images');