-- Add missing UPDATE policy for country_images
CREATE POLICY "Users can update their own images" 
ON public.country_images 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Drop and recreate the public share_links SELECT policy to include expiry check
DROP POLICY IF EXISTS "Anyone can view active share links by token" ON public.share_links;

CREATE POLICY "Anyone can view active non-expired share links" 
ON public.share_links 
FOR SELECT 
USING (
  active = true 
  AND (expires_at IS NULL OR expires_at > now())
);