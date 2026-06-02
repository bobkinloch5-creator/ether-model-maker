DROP POLICY IF EXISTS "anyone can read roadmap votes" ON public.roadmap_votes;

CREATE POLICY "authenticated can read roadmap votes"
  ON public.roadmap_votes
  FOR SELECT
  TO authenticated
  USING (true);