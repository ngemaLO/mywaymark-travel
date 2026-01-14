
-- Add confirmation tracking columns to trip_connections
ALTER TABLE public.trip_connections 
ADD COLUMN user_a_confirmed BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN user_b_confirmed BOOLEAN NOT NULL DEFAULT false;

-- Add 'rejected' to status check constraint
ALTER TABLE public.trip_connections 
DROP CONSTRAINT IF EXISTS trip_connections_status_check;

ALTER TABLE public.trip_connections 
ADD CONSTRAINT trip_connections_status_check 
CHECK (status IN ('pending', 'active', 'expired', 'rejected'));
