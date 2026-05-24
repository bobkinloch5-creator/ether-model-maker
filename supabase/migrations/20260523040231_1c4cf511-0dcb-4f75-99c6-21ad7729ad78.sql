
-- ============ TEAMS ============
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  owner_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null,
  role text not null default 'editor' check (role in ('owner','editor','viewer')),
  created_at timestamptz not null default now(),
  unique (team_id, user_id)
);

create table if not exists public.team_invites (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  email text not null,
  role text not null default 'editor' check (role in ('editor','viewer')),
  invited_by uuid not null,
  accepted boolean not null default false,
  accepted_at timestamptz,
  expires_at timestamptz not null default (now() + interval '14 days'),
  created_at timestamptz not null default now()
);
create index if not exists team_invites_email_idx on public.team_invites (lower(email));

alter table public.projects add column if not exists team_id uuid references public.teams(id) on delete set null;
create index if not exists projects_team_id_idx on public.projects(team_id);

-- ============ HELPER FUNCTIONS (definer, avoid recursion) ============
create or replace function public.is_team_member(_team_id uuid, _user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.team_members where team_id = _team_id and user_id = _user_id)
$$;

create or replace function public.is_team_owner(_team_id uuid, _user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.team_members where team_id = _team_id and user_id = _user_id and role = 'owner')
$$;

-- ============ RLS ============
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.team_invites enable row level security;

-- teams
create policy "members read their teams"
  on public.teams for select to authenticated
  using (public.is_team_member(id, auth.uid()) or public.has_role(auth.uid(), 'owner'));

create policy "users create teams"
  on public.teams for insert to authenticated
  with check (owner_id = auth.uid());

create policy "team owners update team"
  on public.teams for update to authenticated
  using (public.is_team_owner(id, auth.uid()))
  with check (public.is_team_owner(id, auth.uid()));

create policy "team owners delete team"
  on public.teams for delete to authenticated
  using (public.is_team_owner(id, auth.uid()));

-- team_members
create policy "members read team members"
  on public.team_members for select to authenticated
  using (public.is_team_member(team_id, auth.uid()) or public.has_role(auth.uid(), 'owner'));

create policy "team owners manage members"
  on public.team_members for all to authenticated
  using (public.is_team_owner(team_id, auth.uid()))
  with check (public.is_team_owner(team_id, auth.uid()));

create policy "users can leave team"
  on public.team_members for delete to authenticated
  using (user_id = auth.uid());

-- team_invites
create policy "members and invitee read invites"
  on public.team_invites for select to authenticated
  using (
    public.is_team_member(team_id, auth.uid())
    or lower(email) = lower(coalesce((select email from public.profiles where id = auth.uid()), ''))
    or public.has_role(auth.uid(), 'owner')
  );

create policy "team owners create invites"
  on public.team_invites for insert to authenticated
  with check (public.is_team_owner(team_id, auth.uid()) and invited_by = auth.uid());

create policy "team owners delete invites"
  on public.team_invites for delete to authenticated
  using (public.is_team_owner(team_id, auth.uid()));

-- projects: extend RLS to allow team members
drop policy if exists "team members access team projects" on public.projects;
create policy "team members access team projects"
  on public.projects for all to authenticated
  using (team_id is not null and public.is_team_member(team_id, auth.uid()))
  with check (team_id is not null and public.is_team_member(team_id, auth.uid()));

-- ============ FUNCTIONS ============
create or replace function public.create_team(_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  new_id uuid;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if _name is null or char_length(trim(_name)) = 0 then raise exception 'Team name required'; end if;
  insert into public.teams (name, owner_id) values (trim(_name), auth.uid()) returning id into new_id;
  insert into public.team_members (team_id, user_id, role) values (new_id, auth.uid(), 'owner');
  return new_id;
end $$;

create or replace function public.invite_to_team(_team_id uuid, _email text, _role text default 'editor')
returns uuid language plpgsql security definer set search_path = public as $$
declare
  new_id uuid;
  clean_email text := lower(trim(_email));
begin
  if not public.is_team_owner(_team_id, auth.uid()) then
    raise exception 'Only team owners can invite';
  end if;
  if clean_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Invalid email';
  end if;
  if _role not in ('editor','viewer') then raise exception 'Invalid role'; end if;
  insert into public.team_invites (team_id, email, role, invited_by)
  values (_team_id, clean_email, _role, auth.uid())
  returning id into new_id;
  return new_id;
end $$;

create or replace function public.accept_team_invite(_invite_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  inv record;
  user_email text;
begin
  select email into user_email from public.profiles where id = auth.uid();
  if user_email is null then raise exception 'Not authenticated'; end if;

  select * into inv from public.team_invites where id = _invite_id;
  if inv is null then raise exception 'Invite not found'; end if;
  if inv.accepted then raise exception 'Invite already accepted'; end if;
  if inv.expires_at < now() then raise exception 'Invite expired'; end if;
  if lower(inv.email) <> lower(user_email) then raise exception 'Invite not for this email'; end if;

  insert into public.team_members (team_id, user_id, role)
  values (inv.team_id, auth.uid(), inv.role)
  on conflict (team_id, user_id) do nothing;

  update public.team_invites set accepted = true, accepted_at = now() where id = _invite_id;
  return inv.team_id;
end $$;

-- ============ ADMIN LEDGER DRILL-DOWN ============
create or replace function public.get_user_ledger(target_user_id uuid, _limit int default 200, _offset int default 0)
returns table (
  id uuid,
  user_id uuid,
  amount integer,
  balance_after integer,
  kind text,
  reason text,
  reference_id text,
  metadata jsonb,
  created_at timestamptz
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'owner') and auth.uid() <> target_user_id then
    raise exception 'Not authorized';
  end if;
  return query
    select l.id, l.user_id, l.amount, l.balance_after, l.kind, l.reason, l.reference_id, l.metadata, l.created_at
    from public.credit_ledger l
    where l.user_id = target_user_id
    order by l.created_at desc
    limit greatest(1, least(_limit, 1000))
    offset greatest(0, _offset);
end $$;

revoke all on function public.create_team(text) from public;
revoke all on function public.invite_to_team(uuid,text,text) from public;
revoke all on function public.accept_team_invite(uuid) from public;
revoke all on function public.get_user_ledger(uuid,int,int) from public;
grant execute on function public.create_team(text) to authenticated;
grant execute on function public.invite_to_team(uuid,text,text) to authenticated;
grant execute on function public.accept_team_invite(uuid) to authenticated;
grant execute on function public.get_user_ledger(uuid,int,int) to authenticated;

-- touch_updated_at on teams
drop trigger if exists teams_touch_updated_at on public.teams;
create trigger teams_touch_updated_at before update on public.teams
  for each row execute function public.touch_updated_at();
