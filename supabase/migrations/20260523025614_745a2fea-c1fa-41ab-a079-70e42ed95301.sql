
-- Role enum + user_roles table
create type public.app_role as enum ('owner', 'admin', 'user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "users read own roles" on public.user_roles for select to authenticated using (auth.uid() = user_id);
create policy "owners read all roles" on public.user_roles for select to authenticated using (public.has_role(auth.uid(), 'owner'));
create policy "owners manage roles" on public.user_roles for all to authenticated using (public.has_role(auth.uid(), 'owner')) with check (public.has_role(auth.uid(), 'owner'));

-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null default '',
  avatar_url text not null default '',
  credits integer not null default 25,
  api_key text not null default '',
  sl_username text,
  roblox_username text,
  is_owner boolean not null default false,
  owner_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "users read own profile" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "owners read all profiles" on public.profiles for select to authenticated using (public.has_role(auth.uid(), 'owner'));
create policy "users update own profile" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create policy "owners update all profiles" on public.profiles for update to authenticated using (public.has_role(auth.uid(), 'owner')) with check (true);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Projects
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);
alter table public.projects enable row level security;
create policy "users manage own projects" on public.projects for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owners read all projects" on public.projects for select to authenticated using (public.has_role(auth.uid(), 'owner'));

-- Generations
create table public.generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  prompt text not null default '',
  enhanced_prompt text,
  generation_type text not null,
  status text not null default 'pending',
  result_data jsonb not null default '{}'::jsonb,
  credits_used integer not null default 0,
  source text not null default 'web',
  is_uploaded boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.generations enable row level security;
create index on public.generations (user_id, created_at desc);
create policy "users manage own generations" on public.generations for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owners read all generations" on public.generations for select to authenticated using (public.has_role(auth.uid(), 'owner'));

-- Purchases
create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  credits integer not null,
  amount_paid numeric(10,2) not null default 0,
  payment_method text not null default 'paypal',
  transaction_id text,
  status text not null default 'completed',
  created_at timestamptz not null default now()
);
alter table public.purchases enable row level security;
create index on public.purchases (user_id, created_at desc);
create policy "users read own purchases" on public.purchases for select to authenticated using (auth.uid() = user_id);
create policy "owners read all purchases" on public.purchases for select to authenticated using (public.has_role(auth.uid(), 'owner'));

-- PayPal idempotency
create table public.paypal_orders (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  credits integer not null,
  amount numeric(10,2) not null,
  status text not null default 'created',
  raw jsonb,
  created_at timestamptz not null default now(),
  captured_at timestamptz
);
alter table public.paypal_orders enable row level security;
create policy "users read own paypal orders" on public.paypal_orders for select to authenticated using (auth.uid() = user_id);

-- API keys
create table public.api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null unique,
  label text not null default 'API Key',
  created_at timestamptz not null default now()
);
alter table public.api_keys enable row level security;
create policy "users manage own api keys" on public.api_keys for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- RPC: deduct credits atomically
create or replace function public.deduct_credits(user_uuid uuid, amount integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_credits integer;
  is_owner_user boolean;
begin
  select public.has_role(user_uuid, 'owner') into is_owner_user;
  if is_owner_user then
    select credits into new_credits from public.profiles where id = user_uuid;
    return new_credits;
  end if;
  update public.profiles
    set credits = credits - amount
    where id = user_uuid and credits >= amount
    returning credits into new_credits;
  if new_credits is null then
    raise exception 'Insufficient credits';
  end if;
  return new_credits;
end $$;

-- RPC: add credits + record purchase
create or replace function public.add_credits(
  user_uuid uuid,
  amount integer,
  payment_method text default 'paypal',
  transaction_id text default null,
  amount_paid numeric default 0
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_credits integer;
begin
  update public.profiles set credits = credits + amount
    where id = user_uuid returning credits into new_credits;
  if new_credits is null then
    raise exception 'Profile not found';
  end if;
  insert into public.purchases (user_id, credits, amount_paid, payment_method, transaction_id, status)
    values (user_uuid, amount, amount_paid, payment_method, transaction_id, 'completed');
  return new_credits;
end $$;

-- RPC: get user stats
create or replace function public.get_user_stats(user_uuid uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'current_credits', coalesce((select credits from public.profiles where id = user_uuid), 0),
    'total_purchased', coalesce((select sum(credits) from public.purchases where user_id = user_uuid and status = 'completed'), 0),
    'total_used', coalesce((select sum(credits_used) from public.generations where user_id = user_uuid), 0),
    'total_generations', coalesce((select count(*) from public.generations where user_id = user_uuid), 0),
    'member_since', coalesce((select created_at from public.profiles where id = user_uuid), now())
  )
$$;

-- RPC: create api key
create or replace function public.create_api_key(user_uuid uuid, key_label text default 'API Key')
returns setof public.api_keys
language plpgsql
security definer
set search_path = public
as $$
declare
  new_key text;
begin
  new_key := encode(gen_random_bytes(24), 'hex');
  return query insert into public.api_keys (user_id, key, label) values (user_uuid, new_key, key_label) returning *;
end $$;

-- Auto-create profile + role + free credits on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_emails text[] := array['bobkinloch5@gmail.com','mirkwood25@gmail.com','aiyerrajiv@gmail.com'];
  is_admin boolean := lower(new.email) = any (admin_emails);
begin
  insert into public.profiles (id, email, display_name, credits, is_owner, api_key)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    case when is_admin then 999999 else 25 end,
    is_admin,
    encode(gen_random_bytes(16), 'hex')
  );
  insert into public.user_roles (user_id, role)
  values (new.id, case when is_admin then 'owner'::app_role else 'user'::app_role end);
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Storage bucket for generated models
insert into storage.buckets (id, name, public) values ('models', 'models', true)
  on conflict (id) do nothing;

create policy "Public read models" on storage.objects for select using (bucket_id = 'models');
create policy "Users upload to own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'models' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Users delete own files" on storage.objects for delete to authenticated
  using (bucket_id = 'models' and (storage.foldername(name))[1] = auth.uid()::text);
