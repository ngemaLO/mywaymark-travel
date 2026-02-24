ALTER TABLE public.trip_messages 
ADD CONSTRAINT trip_messages_content_length_check 
CHECK (length(content) > 0 AND length(content) <= 2000);