CREATE TABLE public.trip_summaries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  highlights JSONB NOT NULL DEFAULT '[]'::jsonb,
  stats_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_context JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('pending', 'ready', 'failed')),
  error_message TEXT,
  model TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (trip_id)
);

ALTER TABLE public.trip_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own trip summaries"
ON public.trip_summaries FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own trip summaries"
ON public.trip_summaries FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trip summaries"
ON public.trip_summaries FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trip summaries"
ON public.trip_summaries FOR DELETE
USING (auth.uid() = user_id);

CREATE TRIGGER update_trip_summaries_updated_at
BEFORE UPDATE ON public.trip_summaries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_trip_summaries_user_generated
ON public.trip_summaries(user_id, generated_at DESC);
