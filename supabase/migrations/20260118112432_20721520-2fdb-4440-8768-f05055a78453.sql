-- Add created_by column to track who created each place
ALTER TABLE public.places ADD COLUMN IF NOT EXISTS created_by uuid;

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can insert places" ON public.places;
DROP POLICY IF EXISTS "Authenticated users can update places" ON public.places;

-- Create new INSERT policy that sets created_by to current user
CREATE POLICY "Authenticated users can insert places" 
ON public.places 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Create trigger to automatically set created_by on insert
CREATE OR REPLACE FUNCTION public.set_place_created_by()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.created_by := auth.uid();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_place_created_by_trigger ON public.places;
CREATE TRIGGER set_place_created_by_trigger
  BEFORE INSERT ON public.places
  FOR EACH ROW
  EXECUTE FUNCTION public.set_place_created_by();

-- Create UPDATE policy that restricts updates to place creators only
CREATE POLICY "Users can update their own places" 
ON public.places 
FOR UPDATE 
TO authenticated
USING (auth.uid() = created_by);