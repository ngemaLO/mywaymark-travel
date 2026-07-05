ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS seen_milestones INTEGER[] DEFAULT '{}';
