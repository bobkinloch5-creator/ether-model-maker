
CREATE TABLE public.roadmap_votes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_slug text NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (item_slug, user_id)
);

CREATE INDEX idx_roadmap_votes_slug ON public.roadmap_votes(item_slug);

ALTER TABLE public.roadmap_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can read roadmap votes"
  ON public.roadmap_votes FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "users can vote"
  ON public.roadmap_votes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users can remove own vote"
  ON public.roadmap_votes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
