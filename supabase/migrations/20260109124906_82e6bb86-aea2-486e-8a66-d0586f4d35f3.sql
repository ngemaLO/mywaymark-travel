-- Create home_bases table
CREATE TABLE public.home_bases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  country_iso2 TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.home_bases ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own home bases"
ON public.home_bases FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own home bases"
ON public.home_bases FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own home bases"
ON public.home_bases FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own home bases"
ON public.home_bases FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_home_bases_updated_at
BEFORE UPDATE ON public.home_bases
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();