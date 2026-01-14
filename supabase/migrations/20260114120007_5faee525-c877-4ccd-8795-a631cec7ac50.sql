
-- Create trip_connection_codes table for short codes
CREATE TABLE public.trip_connection_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create trip_connections table
CREATE TABLE public.trip_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_a_id UUID NOT NULL,
  user_b_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'expired')),
  initiated_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(trip_id, user_a_id, user_b_id)
);

-- Create trip_messages table
CREATE TABLE public.trip_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES public.trip_connections(id) ON DELETE CASCADE,
  sender_user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.trip_connection_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_messages ENABLE ROW LEVEL SECURITY;

-- RLS for trip_connection_codes
CREATE POLICY "Users can view their own codes"
ON public.trip_connection_codes FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own codes"
ON public.trip_connection_codes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own codes"
ON public.trip_connection_codes FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Anyone can lookup valid codes by code or token"
ON public.trip_connection_codes FOR SELECT
USING (expires_at IS NULL OR expires_at > now());

-- RLS for trip_connections
CREATE POLICY "Users can view connections they are part of"
ON public.trip_connections FOR SELECT
USING (auth.uid() = user_a_id OR auth.uid() = user_b_id);

CREATE POLICY "Users can create connections they initiate"
ON public.trip_connections FOR INSERT
WITH CHECK (auth.uid() = initiated_by AND (auth.uid() = user_a_id OR auth.uid() = user_b_id));

CREATE POLICY "Users can update connections they are part of"
ON public.trip_connections FOR UPDATE
USING (auth.uid() = user_a_id OR auth.uid() = user_b_id);

-- RLS for trip_messages
CREATE POLICY "Users can view messages in their connections"
ON public.trip_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.trip_connections tc
    WHERE tc.id = connection_id
    AND (tc.user_a_id = auth.uid() OR tc.user_b_id = auth.uid())
  )
);

CREATE POLICY "Users can send messages in active connections"
ON public.trip_messages FOR INSERT
WITH CHECK (
  auth.uid() = sender_user_id AND
  EXISTS (
    SELECT 1 FROM public.trip_connections tc
    WHERE tc.id = connection_id
    AND tc.status = 'active'
    AND (tc.user_a_id = auth.uid() OR tc.user_b_id = auth.uid())
  )
);

-- Create indexes for performance
CREATE INDEX idx_trip_connection_codes_code ON public.trip_connection_codes(code);
CREATE INDEX idx_trip_connection_codes_token ON public.trip_connection_codes(token);
CREATE INDEX idx_trip_connections_users ON public.trip_connections(user_a_id, user_b_id);
CREATE INDEX idx_trip_connections_trip ON public.trip_connections(trip_id);
CREATE INDEX idx_trip_messages_connection ON public.trip_messages(connection_id);

-- Create function to update updated_at
CREATE TRIGGER update_trip_connections_updated_at
BEFORE UPDATE ON public.trip_connections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
