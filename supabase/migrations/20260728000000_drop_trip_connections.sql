-- The in-person "trip connections" feature (QR code / short code handshake) has been
-- replaced by follows + public profile QR codes. Nothing in the app writes to these
-- tables anymore, so remove the now-dead schema.
--
-- Also fixes a real RLS bug that would otherwise remain live: the
-- "Anyone can lookup valid codes by code or token" policy on trip_connection_codes
-- had no auth.uid() check at all, letting any anon request read every
-- non-expired row in the table.

DROP POLICY IF EXISTS "Users can view profiles of connected users" ON public.profiles;

DROP TRIGGER IF EXISTS on_connection_activated ON public.trip_connections;
DROP FUNCTION IF EXISTS public.auto_follow_on_connection();

DROP TABLE IF EXISTS public.trip_messages;
DROP TABLE IF EXISTS public.trip_connections;
DROP TABLE IF EXISTS public.trip_connection_codes;
