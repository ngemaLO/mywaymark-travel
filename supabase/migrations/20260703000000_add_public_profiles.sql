-- Add username and public flag to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username TEXT,
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false;

-- Unique index on username (partial — only enforced when username is set)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique
  ON public.profiles (username) WHERE username IS NOT NULL;

-- Index for fast username lookups
CREATE INDEX IF NOT EXISTS profiles_username_idx
  ON public.profiles (username);

-- Allow anyone (including unauthenticated) to read public profiles
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles'
      AND policyname = 'Public profiles are viewable by anyone'
  ) THEN
    CREATE POLICY "Public profiles are viewable by anyone"
      ON public.profiles FOR SELECT
      TO public
      USING (is_public = true);
  END IF;
END $$;

-- Allow anyone to read visits belonging to users with public profiles
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'visits'
      AND policyname = 'Visits of public profiles are viewable by anyone'
  ) THEN
    CREATE POLICY "Visits of public profiles are viewable by anyone"
      ON public.visits FOR SELECT
      TO public
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.user_id = visits.user_id
            AND p.is_public = true
        )
      );
  END IF;
END $$;
