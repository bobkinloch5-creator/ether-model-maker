-- Moderation fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_banned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ban_reason text,
  ADD COLUMN IF NOT EXISTS banned_at timestamptz;

-- Ban / unban
CREATE OR REPLACE FUNCTION public.admin_set_banned(target_user_id uuid, value boolean, reason text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
begin
  if not public.has_role(auth.uid(), 'owner') then
    raise exception 'Only owners can moderate users';
  end if;
  if target_user_id = auth.uid() and value = true then
    raise exception 'Cannot ban yourself';
  end if;
  update public.profiles
    set is_banned = value,
        ban_reason = case when value then reason else null end,
        banned_at = case when value then now() else null end
    where id = target_user_id;
  if not found then raise exception 'Profile not found'; end if;
  perform public.log_credit_change(
    target_user_id, 0,
    case when value then 'moderation_ban' else 'moderation_unban' end,
    case when value then coalesce('Banned: '||reason, 'Banned by admin') else 'Unbanned by admin' end,
    auth.uid()::text, '{}'::jsonb
  );
  return value;
end $$;

-- Delete a single generation
CREATE OR REPLACE FUNCTION public.admin_delete_generation(gen_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
begin
  if not public.has_role(auth.uid(), 'owner') then
    raise exception 'Only owners can delete generations';
  end if;
  delete from public.generations where id = gen_id;
  return found;
end $$;

-- Wipe all generations for a user
CREATE OR REPLACE FUNCTION public.admin_wipe_user_generations(target_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  removed integer;
begin
  if not public.has_role(auth.uid(), 'owner') then
    raise exception 'Only owners can wipe generations';
  end if;
  with d as (delete from public.generations where user_id = target_user_id returning 1)
  select count(*) into removed from d;
  return removed;
end $$;