
-- 1. Add manager flag
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_manager boolean NOT NULL DEFAULT false;

-- 2. Backfill: any existing mirkwood25 account
UPDATE public.profiles
  SET is_manager = true
  WHERE lower(email) = 'mirkwood25@gmail.com';

-- 3. Update handle_new_user to auto-flag manager on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  admin_emails text[] := array['bobkinloch5@gmail.com','mirkwood25@gmail.com','aiyerrajiv@gmail.com'];
  manager_emails text[] := array['mirkwood25@gmail.com'];
  is_admin boolean := lower(new.email) = any (admin_emails);
  is_manager_flag boolean := lower(new.email) = any (manager_emails);
  grant_amount integer := case when is_admin then 999999 else 25 end;
  ref_code text := nullif(upper(trim(coalesce(new.raw_user_meta_data->>'referral_code', ''))), '');
  referrer record;
  new_code text := upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8));
  bonus_amount integer := 50;
begin
  if ref_code is not null then
    select id, credits, is_owner into referrer
    from public.profiles
    where upper(referral_code) = ref_code
    limit 1;
  end if;

  insert into public.profiles (id, email, display_name, credits, is_owner, is_manager, api_key, referral_code, referred_by)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    grant_amount + case when referrer.id is not null and not is_admin then bonus_amount else 0 end,
    is_admin,
    is_manager_flag,
    encode(gen_random_bytes(16), 'hex'),
    new_code,
    referrer.id
  );
  insert into public.user_roles (user_id, role)
  values (new.id, case when is_admin then 'owner'::app_role else 'user'::app_role end);

  perform public.log_credit_change(
    new.id,
    grant_amount,
    case when is_admin then 'admin_signup_bonus' else 'signup_bonus' end,
    case when is_admin then 'Owner account created with unlimited credits' else 'Welcome bonus on signup' end,
    null,
    jsonb_build_object('email', new.email)
  );

  if referrer.id is not null and referrer.id <> new.id then
    if not is_admin then
      perform public.log_credit_change(
        new.id, bonus_amount, 'referral_bonus',
        format('Referral bonus for using code %s', ref_code),
        ref_code, jsonb_build_object('referrer_id', referrer.id)
      );
    end if;
    update public.profiles set credits = credits + bonus_amount where id = referrer.id;
    perform public.log_credit_change(
      referrer.id, bonus_amount, 'referral_bonus',
      format('Earned %s credits for referring %s', bonus_amount, new.email),
      new.id::text, jsonb_build_object('referred_user_id', new.id, 'referred_email', new.email)
    );

    insert into public.referrals (referrer_id, referred_user_id, code_used, referrer_bonus, referred_bonus)
    values (referrer.id, new.id, ref_code, bonus_amount, case when is_admin then 0 else bonus_amount end);
  end if;

  return new;
end $function$;

-- 4. Owner-only: set/unset manager flag
CREATE OR REPLACE FUNCTION public.admin_set_manager(target_user_id uuid, value boolean)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
begin
  if not public.has_role(auth.uid(), 'owner') then
    raise exception 'Only owners can change manager status';
  end if;
  update public.profiles set is_manager = value where id = target_user_id;
  if not found then raise exception 'Profile not found'; end if;
  return value;
end $$;

-- 5. Owner-only: set/unset owner flag (promote/demote)
CREATE OR REPLACE FUNCTION public.admin_set_owner(target_user_id uuid, value boolean)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
begin
  if not public.has_role(auth.uid(), 'owner') then
    raise exception 'Only owners can change owner status';
  end if;
  if target_user_id = auth.uid() and value = false then
    raise exception 'Cannot demote yourself';
  end if;
  update public.profiles set is_owner = value where id = target_user_id;
  if not found then raise exception 'Profile not found'; end if;

  if value then
    insert into public.user_roles (user_id, role) values (target_user_id, 'owner')
    on conflict do nothing;
  else
    delete from public.user_roles where user_id = target_user_id and role = 'owner';
  end if;
  return value;
end $$;

-- 6. Analytics dashboard data
CREATE OR REPLACE FUNCTION public.admin_get_analytics()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
declare
  result jsonb;
begin
  if not public.has_role(auth.uid(), 'owner') then
    raise exception 'Only owners can view analytics';
  end if;

  select jsonb_build_object(
    'totals', (
      select jsonb_build_object(
        'users', (select count(*) from public.profiles),
        'managers', (select count(*) from public.profiles where is_manager),
        'owners', (select count(*) from public.profiles where is_owner),
        'generations', (select count(*) from public.generations),
        'credits_circulating', (select coalesce(sum(credits),0) from public.profiles),
        'purchases_count', (select count(*) from public.purchases where status='completed'),
        'revenue_total', (select coalesce(sum(amount_paid),0) from public.purchases where status='completed'),
        'credits_sold', (select coalesce(sum(credits),0) from public.purchases where status='completed'),
        'revenue_30d', (select coalesce(sum(amount_paid),0) from public.purchases where status='completed' and created_at > now() - interval '30 days'),
        'new_users_30d', (select count(*) from public.profiles where created_at > now() - interval '30 days'),
        'generations_30d', (select count(*) from public.generations where created_at > now() - interval '30 days'),
        'referrals_count', (select count(*) from public.referrals)
      )
    ),
    'daily', (
      select coalesce(jsonb_agg(row_to_json(d) order by d.day), '[]'::jsonb)
      from (
        select
          to_char(day, 'YYYY-MM-DD') as day,
          coalesce((select count(*) from public.profiles where date_trunc('day', created_at) = day), 0) as new_users,
          coalesce((select count(*) from public.generations where date_trunc('day', created_at) = day), 0) as generations,
          coalesce((select sum(amount_paid) from public.purchases where status='completed' and date_trunc('day', created_at) = day), 0) as revenue,
          coalesce((select sum(credits) from public.purchases where status='completed' and date_trunc('day', created_at) = day), 0) as credits_sold
        from generate_series(date_trunc('day', now() - interval '29 days'), date_trunc('day', now()), interval '1 day') as day
      ) d
    ),
    'top_spenders', (
      select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb)
      from (
        select p.email, p.display_name, sum(pu.amount_paid)::numeric as spent, sum(pu.credits)::int as credits
        from public.purchases pu
        join public.profiles p on p.id = pu.user_id
        where pu.status='completed'
        group by p.email, p.display_name
        order by spent desc
        limit 10
      ) t
    ),
    'recent_purchases', (
      select coalesce(jsonb_agg(row_to_json(r) order by r.created_at desc), '[]'::jsonb)
      from (
        select pu.id, pu.created_at, pu.amount_paid, pu.credits, pu.payment_method, p.email, p.display_name
        from public.purchases pu
        join public.profiles p on p.id = pu.user_id
        where pu.status='completed'
        order by pu.created_at desc
        limit 15
      ) r
    ),
    'recent_generations', (
      select coalesce(jsonb_agg(row_to_json(r) order by r.created_at desc), '[]'::jsonb)
      from (
        select g.id, g.created_at, g.generation_type, g.credits_used, g.status, p.email
        from public.generations g
        join public.profiles p on p.id = g.user_id
        order by g.created_at desc
        limit 15
      ) r
    )
  ) into result;

  return result;
end $$;
