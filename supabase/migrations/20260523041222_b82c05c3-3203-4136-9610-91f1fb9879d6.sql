ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bio text DEFAULT '',
  ADD COLUMN IF NOT EXISTS accent_color text DEFAULT 'violet',
  ADD COLUMN IF NOT EXISTS banner_gradient text DEFAULT 'aurora',
  ADD COLUMN IF NOT EXISTS avatar_style text DEFAULT 'avataaars',
  ADD COLUMN IF NOT EXISTS avatar_seed text DEFAULT '';