CREATE TABLE IF NOT EXISTS public.visit_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  visit_id UUID NOT NULL REFERENCES public.visits(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  storage_path TEXT,
  media_type TEXT NOT NULL DEFAULT 'photo' CHECK (media_type IN ('photo', 'video')),
  caption TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.visit_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own visit media"
  ON public.visit_media FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_visit_media_visit_id ON public.visit_media(visit_id, created_at ASC);

INSERT INTO storage.buckets (id, name, public)
VALUES ('visit-media', 'visit-media', true)
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Visit media publicly viewable'
  ) THEN
    CREATE POLICY "Visit media publicly viewable"
      ON storage.objects FOR SELECT TO public
      USING (bucket_id = 'visit-media');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Users upload their own visit media'
  ) THEN
    CREATE POLICY "Users upload their own visit media"
      ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'visit-media' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Users delete their own visit media'
  ) THEN
    CREATE POLICY "Users delete their own visit media"
      ON storage.objects FOR DELETE TO authenticated
      USING (bucket_id = 'visit-media' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
END $$;
