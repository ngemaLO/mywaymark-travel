-- Create a table to track which places/cities a user has visited
-- This is separate from the visits table which tracks specific trip dates
CREATE TABLE public.user_places (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  place_id UUID NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, place_id)
);

-- Enable RLS
ALTER TABLE public.user_places ENABLE ROW LEVEL SECURITY;

-- Users can only see their own places
CREATE POLICY "Users can view their own places"
ON public.user_places
FOR SELECT
USING (auth.uid() = user_id);

-- Users can add their own places
CREATE POLICY "Users can insert their own places"
ON public.user_places
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own places
CREATE POLICY "Users can delete their own places"
ON public.user_places
FOR DELETE
USING (auth.uid() = user_id);