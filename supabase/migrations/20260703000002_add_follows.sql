CREATE TABLE IF NOT EXISTS public.follows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (follower_id, following_id),
  CHECK (follower_id != following_id)
);

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS follows_follower_idx ON public.follows (follower_id);
CREATE INDEX IF NOT EXISTS follows_following_idx ON public.follows (following_id);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'follows'
      AND policyname = 'Follows are publicly readable'
  ) THEN
    CREATE POLICY "Follows are publicly readable"
      ON public.follows FOR SELECT TO public USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'follows'
      AND policyname = 'Users can follow others'
  ) THEN
    CREATE POLICY "Users can follow others"
      ON public.follows FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = follower_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'follows'
      AND policyname = 'Users can unfollow'
  ) THEN
    CREATE POLICY "Users can unfollow"
      ON public.follows FOR DELETE TO authenticated
      USING (auth.uid() = follower_id);
  END IF;
END $$;
