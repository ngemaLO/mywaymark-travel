-- Create enum for added_method
CREATE TYPE public.chapter_trip_method AS ENUM ('auto', 'manual');

-- Create chapters table
CREATE TABLE public.chapters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  home_base_country_iso2 TEXT,
  description TEXT,
  cover_style TEXT,
  is_private BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create chapter_trips join table
CREATE TABLE public.chapter_trips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  chapter_id UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  added_method chapter_trip_method NOT NULL DEFAULT 'auto',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(chapter_id, trip_id)
);

-- Enable RLS on chapters
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;

-- RLS policies for chapters
CREATE POLICY "Users can view their own chapters"
ON public.chapters FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own chapters"
ON public.chapters FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chapters"
ON public.chapters FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chapters"
ON public.chapters FOR DELETE
USING (auth.uid() = user_id);

-- Enable RLS on chapter_trips
ALTER TABLE public.chapter_trips ENABLE ROW LEVEL SECURITY;

-- RLS policies for chapter_trips
CREATE POLICY "Users can view their own chapter trips"
ON public.chapter_trips FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own chapter trips"
ON public.chapter_trips FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chapter trips"
ON public.chapter_trips FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chapter trips"
ON public.chapter_trips FOR DELETE
USING (auth.uid() = user_id);

-- Add updated_at trigger for chapters
CREATE TRIGGER update_chapters_updated_at
BEFORE UPDATE ON public.chapters
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add foreign key for home_base_country_iso2
ALTER TABLE public.chapters
ADD CONSTRAINT chapters_home_base_country_iso2_fkey
FOREIGN KEY (home_base_country_iso2) REFERENCES public.countries(iso2);