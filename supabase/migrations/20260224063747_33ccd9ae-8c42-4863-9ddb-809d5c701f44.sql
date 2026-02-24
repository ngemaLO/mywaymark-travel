
-- Allow viewing display_name of users in pending/active trip connections
CREATE POLICY "Users can view profiles of connected users"
ON public.profiles
FOR SELECT
USING (
  user_id IN (
    SELECT CASE 
      WHEN user_a_id = auth.uid() THEN user_b_id
      WHEN user_b_id = auth.uid() THEN user_a_id
    END
    FROM public.trip_connections
    WHERE (user_a_id = auth.uid() OR user_b_id = auth.uid())
      AND status IN ('pending', 'active')
  )
);
