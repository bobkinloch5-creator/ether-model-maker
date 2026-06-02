-- Community posts
CREATE TABLE public.community_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  generation_id uuid,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  description text CHECK (description IS NULL OR char_length(description) <= 2000),
  image_url text,
  model_url text,
  generation_type text,
  tags text[] DEFAULT '{}'::text[],
  likes_count integer NOT NULL DEFAULT 0,
  comments_count integer NOT NULL DEFAULT 0,
  is_hidden boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_community_posts_created_at ON public.community_posts (created_at DESC);
CREATE INDEX idx_community_posts_user_id ON public.community_posts (user_id);

ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated read community posts"
ON public.community_posts FOR SELECT
TO authenticated
USING (is_hidden = false OR auth.uid() = user_id OR public.has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "users insert own community posts"
ON public.community_posts FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users update own community posts"
ON public.community_posts FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users delete own community posts"
ON public.community_posts FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "owners moderate community posts"
ON public.community_posts FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'owner'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'owner'::app_role));

CREATE TRIGGER community_posts_touch
BEFORE UPDATE ON public.community_posts
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Likes
CREATE TABLE public.community_likes (
  post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);
CREATE INDEX idx_community_likes_user ON public.community_likes (user_id);

ALTER TABLE public.community_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated read community likes"
ON public.community_likes FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "users like as self"
ON public.community_likes FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users unlike own likes"
ON public.community_likes FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Comments
CREATE TABLE public.community_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 1000),
  is_hidden boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_community_comments_post ON public.community_comments (post_id, created_at);

ALTER TABLE public.community_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated read community comments"
ON public.community_comments FOR SELECT
TO authenticated
USING (is_hidden = false OR auth.uid() = user_id OR public.has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "users insert own comments"
ON public.community_comments FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users delete own comments"
ON public.community_comments FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "owners moderate comments"
ON public.community_comments FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'owner'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'owner'::app_role));

-- Counter triggers
CREATE OR REPLACE FUNCTION public.community_likes_count_trg()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.community_posts SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$;

CREATE TRIGGER community_likes_count
AFTER INSERT OR DELETE ON public.community_likes
FOR EACH ROW EXECUTE FUNCTION public.community_likes_count_trg();

CREATE OR REPLACE FUNCTION public.community_comments_count_trg()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.community_posts SET comments_count = GREATEST(0, comments_count - 1) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$;

CREATE TRIGGER community_comments_count
AFTER INSERT OR DELETE ON public.community_comments
FOR EACH ROW EXECUTE FUNCTION public.community_comments_count_trg();