-- Migration: Allow authenticated users to delete their own account.
-- The function runs as SECURITY DEFINER (postgres role) so it can
-- remove the row from auth.users.  All profile / category / expense /
-- month_settings rows cascade-delete automatically thanks to the
-- existing foreign-key ON DELETE CASCADE chain.

create or replace function public.delete_own_account()
returns void
language sql
security definer
set search_path = public
as $$
  delete from auth.users where id = auth.uid();
$$;

-- Only authenticated users may call this function.
revoke all on function public.delete_own_account() from public;
grant execute on function public.delete_own_account() to authenticated;
