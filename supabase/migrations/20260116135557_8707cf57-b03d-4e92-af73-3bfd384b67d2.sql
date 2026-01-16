-- Create letter scope enum
CREATE TYPE public.letter_scope AS ENUM ('year', 'chapter', 'custom');

-- Create letter status enum
CREATE TYPE public.letter_status AS ENUM ('ready', 'failed');

-- Create waymark_letters table
CREATE TABLE public.waymark_letters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,

  scope letter_scope NOT NULL,
  chapter_id UUID NULL REFERENCES public.chapters(id) ON DELETE SET NULL,

  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  title TEXT NOT NULL,
  subtitle TEXT NULL,

  theme TEXT NOT NULL,
  body TEXT NOT NULL,

  supporting_signals JSONB NOT NULL DEFAULT '[]'::jsonb,
  stats_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,

  status letter_status NOT NULL DEFAULT 'ready',
  error_message TEXT NULL,

  version INTEGER NOT NULL DEFAULT 1,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.waymark_letters ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own letters"
ON public.waymark_letters FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own letters"
ON public.waymark_letters FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own letters"
ON public.waymark_letters FOR DELETE
USING (auth.uid() = user_id);

-- Update trigger
CREATE TRIGGER update_waymark_letters_updated_at
BEFORE UPDATE ON public.waymark_letters
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for performance
CREATE INDEX idx_waymark_letters_user_scope_period
ON public.waymark_letters(user_id, scope, period_start, period_end);

CREATE INDEX idx_waymark_letters_user_generated
ON public.waymark_letters(user_id, generated_at DESC);