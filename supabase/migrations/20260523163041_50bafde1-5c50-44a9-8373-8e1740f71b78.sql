-- credit_ledger table
create table if not exists public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  amount integer not null,
  balance_after integer,
  kind text not null,
  reason text,
  reference_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_credit_ledger_user_created on public.credit_ledger(user_id, created_at desc);
alter table public.credit_ledger enable row level security;
create policy "users read own ledger" on public.credit_ledger for select to authenticated using (auth.uid() = user_id);
create policy "owners read all ledger" on public.credit_ledger for select to authenticated using (public.has_role(auth.uid(), 'owner'));

-- log_credit_change helper
create or replace function public.log_credit_change(
  _user_id uuid, _amount integer, _kind text, _reason text default null,
  _reference_id text default null, _metadata jsonb default '{}'::jsonb
) returns void language plpgsql security definer set search_path = public as $$
declare _balance integer;
begin select credits into _balance from public.profiles where id = _user_id;
insert into public.credit_ledger (user_id, amount, balance_after, kind, reason, reference_id, metadata)
values (_user_id, _amount, _balance, _kind, _reason, _reference_id, coalesce(_metadata, '{}'::jsonb));
end $$;

-- Moderation fields on profiles
alter table public.profiles
  add column if not exists is_banned boolean not null default false,
  add column if not exists ban_reason text,
  add column if not exists banned_at timestamptz;

-- admin_set_banned
create or replace function public.admin_set_banned(target_user_id uuid, value boolean, reason text default null)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'owner') then raise exception 'Only owners can moderate users'; end if;
  if target_user_id = auth.uid() and value = true then raise exception 'Cannot ban yourself'; end if;
  update public.profiles set is_banned = value, ban_reason = case when value then reason else null end,
    banned_at = case when value then now() else null end where id = target_user_id;
  if not found then raise exception 'Profile not found'; end if;
  perform public.log_credit_change(target_user_id, 0,
    case when value then 'moderation_ban' else 'moderation_unban' end,
    case when value then coalesce('Banned: '||reason, 'Banned by admin') else 'Unbanned by admin' end,
    auth.uid()::text, '{}'::jsonb);
  return value;
end $$;

-- admin_delete_generation
create or replace function public.admin_delete_generation(gen_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'owner') then raise exception 'Only owners can delete generations'; end if;
  delete from public.generations where id = gen_id; return found;
end $$;

-- admin_wipe_user_generations
create or replace function public.admin_wipe_user_generations(target_user_id uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare removed integer;
begin
  if not public.has_role(auth.uid(), 'owner') then raise exception 'Only owners can wipe generations'; end if;
  with d as (delete from public.generations where user_id = target_user_id returning 1)
  select count(*) into removed from d; return removed;
end $$;

-- Referrals table
create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null,
  referred_user_id uuid not null unique,
  code_used text,
  referrer_bonus integer not null default 0,
  referred_bonus integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.referrals enable row level security;
create policy "users read own referrals" on public.referrals for select to authenticated using (auth.uid() = referrer_id or auth.uid() = referred_user_id);
create policy "owners read all referrals" on public.referrals for select to authenticated using (public.has_role(auth.uid(), 'owner'));

-- Promo codes
create table if not exists public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  credits integer not null check (credits > 0),
  max_uses integer,
  uses_count integer not null default 0,
  expires_at timestamptz,
  active boolean not null default true,
  note text,
  created_by uuid not null,
  created_at timestamptz not null default now()
);
create index if not exists promo_codes_code_idx on public.promo_codes (upper(code));

create table if not exists public.promo_redemptions (
  id uuid primary key default gen_random_uuid(),
  promo_id uuid not null references public.promo_codes(id) on delete cascade,
  user_id uuid not null,
  credits_granted integer not null,
  created_at timestamptz not null default now(),
  unique (promo_id, user_id)
);

alter table public.promo_codes enable row level security;
alter table public.promo_redemptions enable row level security;

create policy "owners manage promo codes" on public.promo_codes for all to authenticated
  using (public.has_role(auth.uid(), 'owner')) with check (public.has_role(auth.uid(), 'owner'));
create policy "owners read all redemptions" on public.promo_redemptions for select to authenticated
  using (public.has_role(auth.uid(), 'owner'));
create policy "users read own redemptions" on public.promo_redemptions for select to authenticated
  using (auth.uid() = user_id);

-- admin_create_promo
create or replace function public.admin_create_promo(
  _code text default null, _credits integer default 100, _max_uses integer default null,
  _expires_at timestamptz default null, _note text default null
) returns public.promo_codes language plpgsql security definer set search_path = public, extensions as $$
declare final_code text; row public.promo_codes;
begin
  if not public.has_role(auth.uid(), 'owner') then raise exception 'Only owners can create promo codes'; end if;
  if _credits is null or _credits <= 0 then raise exception 'Credits must be positive'; end if;
  final_code := nullif(upper(trim(coalesce(_code, ''))), '');
  if final_code is null then final_code := upper(substr(encode(extensions.gen_random_bytes(6), 'hex'), 1, 10)); end if;
  if final_code !~ '^[A-Z0-9_-]{3,32}$' then raise exception 'Invalid code format'; end if;
  insert into public.promo_codes (code, credits, max_uses, expires_at, note, created_by)
  values (final_code, _credits, _max_uses, _expires_at, _note, auth.uid()) returning * into row;
  return row;
end $$;

-- admin_toggle_promo
create or replace function public.admin_toggle_promo(_id uuid, _active boolean)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'owner') then raise exception 'Only owners'; end if;
  update public.promo_codes set active = _active where id = _id; return _active;
end $$;

-- admin_delete_promo
create or replace function public.admin_delete_promo(_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'owner') then raise exception 'Only owners'; end if;
  delete from public.promo_codes where id = _id; return found;
end $$;

-- redeem_promo
create or replace function public.redeem_promo(_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  promo public.promo_codes; clean text := nullif(upper(trim(coalesce(_code, ''))), '');
  new_balance integer;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if clean is null then raise exception 'Code required'; end if;
  select * into promo from public.promo_codes where upper(code) = clean for update;
  if promo.id is null then raise exception 'Invalid code'; end if;
  if not promo.active then raise exception 'Code is inactive'; end if;
  if promo.expires_at is not null and promo.expires_at < now() then raise exception 'Code expired'; end if;
  if promo.max_uses is not null and promo.uses_count >= promo.max_uses then raise exception 'Code has reached its usage limit'; end if;
  if exists (select 1 from public.promo_redemptions where promo_id = promo.id and user_id = auth.uid()) then
    raise exception 'You already redeemed this code';
  end if;
  insert into public.promo_redemptions (promo_id, user_id, credits_granted) values (promo.id, auth.uid(), promo.credits);
  update public.promo_codes set uses_count = uses_count + 1 where id = promo.id;
  update public.profiles set credits = credits + promo.credits where id = auth.uid() returning credits into new_balance;
  perform public.log_credit_change(auth.uid(), promo.credits, 'promo_redemption',
    format('Redeemed promo code %s', promo.code), promo.code, jsonb_build_object('promo_id', promo.id));
  return jsonb_build_object('success', true, 'credits', promo.credits, 'balance', new_balance, 'code', promo.code);
end $$;