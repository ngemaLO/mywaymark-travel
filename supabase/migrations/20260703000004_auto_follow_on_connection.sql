-- When a trip_connection transitions to 'active' (both users confirmed),
-- automatically create mutual follows so each person appears in the other's feed.
-- SECURITY DEFINER lets the function bypass RLS (which only allows users to
-- insert follows where follower_id = auth.uid()).

CREATE OR REPLACE FUNCTION public.auto_follow_on_connection()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'active' AND (OLD.status IS DISTINCT FROM 'active') THEN
    INSERT INTO public.follows (follower_id, following_id)
    VALUES
      (NEW.user_a_id, NEW.user_b_id),
      (NEW.user_b_id, NEW.user_a_id)
    ON CONFLICT (follower_id, following_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_connection_activated ON public.trip_connections;

CREATE TRIGGER on_connection_activated
  AFTER UPDATE ON public.trip_connections
  FOR EACH ROW EXECUTE FUNCTION public.auto_follow_on_connection();
