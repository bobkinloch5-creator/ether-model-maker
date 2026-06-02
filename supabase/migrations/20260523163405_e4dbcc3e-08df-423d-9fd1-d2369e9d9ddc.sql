-- Teams tables
CREATE TABLE IF NOT EXISTS public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  owner_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'editor' CHECK (role IN ('owner','editor','viewer')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.team_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'editor' CHECK (role IN ('editor','viewer')),
  invited_by uuid NOT NULL,
  accepted boolean NOT NULL DEFAULT false,
  accepted_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS team_invites_email_idx ON public.team_invites (lower(email));

ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS projects_team_id_idx ON public.projects(team_id);

-- Team helper functions
CREATE OR REPLACE FUNCTION public.is_team_member(_team_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.team_members WHERE team_id = _team_id AND user_id = _user_id)
$$;

CREATE OR REPLACE FUNCTION public.is_team_owner(_team_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.team_members WHERE team_id = _team_id AND user_id = _user_id AND role = 'owner')
$$;

-- Team RLS
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read their teams" ON public.teams FOR SELECT TO authenticated
  USING (public.is_team_member(id, auth.uid()) OR public.has_role(auth.uid(), 'owner'));
CREATE POLICY "users create teams" ON public.teams FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "team owners update team" ON public.teams FOR UPDATE TO authenticated
  USING (public.is_team_owner(id, auth.uid())) WITH CHECK (public.is_team_owner(id, auth.uid()));
CREATE POLICY "team owners delete team" ON public.teams FOR DELETE TO authenticated
  USING (public.is_team_owner(id, auth.uid()));

CREATE POLICY "members read team members" ON public.team_members FOR SELECT TO authenticated
  USING (public.is_team_member(team_id, auth.uid()) OR public.has_role(auth.uid(), 'owner'));
CREATE POLICY "team owners manage members" ON public.team_members FOR ALL TO authenticated
  USING (public.is_team_owner(team_id, auth.uid())) WITH CHECK (public.is_team_owner(team_id, auth.uid()));
CREATE POLICY "users can leave team" ON public.team_members FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "members and invitee read invites" ON public.team_invites FOR SELECT TO authenticated
  USING (public.is_team_member(team_id, auth.uid()) OR lower(email) = lower(coalesce((SELECT email FROM public.profiles WHERE id = auth.uid()), '')) OR public.has_role(auth.uid(), 'owner'));
CREATE POLICY "team owners create invites" ON public.team_invites FOR INSERT TO authenticated
  WITH CHECK (public.is_team_owner(team_id, auth.uid()) AND invited_by = auth.uid());
CREATE POLICY "team owners delete invites" ON public.team_invites FOR DELETE TO authenticated
  USING (public.is_team_owner(team_id, auth.uid()));

CREATE POLICY "team members access team projects" ON public.projects FOR ALL TO authenticated
  USING (team_id IS NOT NULL AND public.is_team_member(team_id, auth.uid()))
  WITH CHECK (team_id IS NOT NULL AND public.is_team_member(team_id, auth.uid()));

-- Team functions
CREATE OR REPLACE FUNCTION public.create_team(_name text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _name IS NULL OR char_length(trim(_name)) = 0 THEN RAISE EXCEPTION 'Team name required'; END IF;
  INSERT INTO public.teams (name, owner_id) VALUES (trim(_name), auth.uid()) RETURNING id INTO new_id;
  INSERT INTO public.team_members (team_id, user_id, role) VALUES (new_id, auth.uid(), 'owner');
  RETURN new_id;
END $$;

CREATE OR REPLACE FUNCTION public.invite_to_team(_team_id uuid, _email text, _role text DEFAULT 'editor')
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_id uuid; clean_email text := lower(trim(_email));
BEGIN
  IF NOT public.is_team_owner(_team_id, auth.uid()) THEN RAISE EXCEPTION 'Only team owners can invite'; END IF;
  IF clean_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN RAISE EXCEPTION 'Invalid email'; END IF;
  IF _role NOT IN ('editor','viewer') THEN RAISE EXCEPTION 'Invalid role'; END IF;
  INSERT INTO public.team_invites (team_id, email, role, invited_by) VALUES (_team_id, clean_email, _role, auth.uid()) RETURNING id INTO new_id;
  RETURN new_id;
END $$;

CREATE OR REPLACE FUNCTION public.accept_team_invite(_invite_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE inv record; user_email text;
BEGIN
  SELECT email INTO user_email FROM public.profiles WHERE id = auth.uid();
  IF user_email IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO inv FROM public.team_invites WHERE id = _invite_id;
  IF inv IS NULL THEN RAISE EXCEPTION 'Invite not found'; END IF;
  IF inv.accepted THEN RAISE EXCEPTION 'Invite already accepted'; END IF;
  IF inv.expires_at < now() THEN RAISE EXCEPTION 'Invite expired'; END IF;
  IF lower(inv.email) <> lower(user_email) THEN RAISE EXCEPTION 'Invite not for this email'; END IF;
  INSERT INTO public.team_members (team_id, user_id, role) VALUES (inv.team_id, auth.uid(), inv.role) ON CONFLICT (team_id, user_id) DO NOTHING;
  UPDATE public.team_invites SET accepted = true, accepted_at = now() WHERE id = _invite_id;
  RETURN inv.team_id;
END $$;

CREATE OR REPLACE FUNCTION public.get_user_ledger(target_user_id uuid, _limit int default 200, _offset int default 0)
RETURNS TABLE (id uuid, user_id uuid, amount integer, balance_after integer, kind text, reason text, reference_id text, metadata jsonb, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
begin
  if not public.has_role(auth.uid(), 'owner') and auth.uid() <> target_user_id then raise exception 'Not authorized'; end if;
  return query
    select l.id, l.user_id, l.amount, l.balance_after, l.kind, l.reason, l.reference_id, l.metadata, l.created_at
    from public.credit_ledger l where l.user_id = target_user_id order by l.created_at desc
    limit greatest(1, least(_limit, 1000)) offset greatest(0, _offset);
end $$;

-- admin_adjust_credits
CREATE OR REPLACE FUNCTION public.admin_adjust_credits(
  target_user_id uuid, delta integer, note text default null
) returns integer language plpgsql security definer set search_path = public as $$
declare new_credits integer;
begin
  if not public.has_role(auth.uid(), 'owner') then raise exception 'Only owners can adjust credits'; end if;
  update public.profiles set credits = greatest(0, credits + delta)
    where id = target_user_id returning credits into new_credits;
  if new_credits is null then raise exception 'Profile not found'; end if;
  perform public.log_credit_change(
    target_user_id, delta, 'admin_adjustment',
    coalesce(note, 'Admin credit adjustment'), auth.uid()::text,
    jsonb_build_object('admin_id', auth.uid()));
  return new_credits;
end $$;

-- revoke and grant
REVOKE ALL ON FUNCTION public.create_team(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.invite_to_team(uuid,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.accept_team_invite(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_user_ledger(uuid,int,int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_adjust_credits(uuid,integer,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_team(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.invite_to_team(uuid,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_team_invite(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_ledger(uuid,int,int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_adjust_credits(uuid,integer,text) TO authenticated;

-- touch_updated_at on teams
DROP TRIGGER IF EXISTS teams_touch_updated_at ON public.teams;
CREATE TRIGGER teams_touch_updated_at BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- realtime
ALTER TABLE public.team_members REPLICA IDENTITY FULL;
ALTER TABLE public.team_invites REPLICA IDENTITY FULL;
ALTER TABLE public.projects REPLICA IDENTITY FULL;
ALTER TABLE public.teams REPLICA IDENTITY FULL;
ALTER TABLE public.generations REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.team_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.team_invites;
ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;
ALTER PUBLICATION supabase_realtime ADD TABLE public.teams;
ALTER PUBLICATION supabase_realtime ADD TABLE public.generations;

-- Storage update policy
DROP POLICY IF EXISTS "Users can update their own models" ON storage.objects;
CREATE POLICY "Users can update their own models" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'models' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'models' AND (storage.foldername(name))[1] = auth.uid()::text);