-- Add is_travel boolean to trips table
ALTER TABLE public.trips 
ADD COLUMN is_travel boolean NOT NULL DEFAULT true;