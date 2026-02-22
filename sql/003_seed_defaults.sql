create or replace function public.seed_default_categories_for_profile(p_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.categories (profile_id, name, color, system_key)
  values
    (p_profile_id, 'Housing', '#c8a96e', 'housing'),
    (p_profile_id, 'Food', '#5cbb8a', 'food'),
    (p_profile_id, 'Transport', '#5c9abb', 'transport'),
    (p_profile_id, 'Entertainment', '#bb5caa', 'entertainment'),
    (p_profile_id, 'Health', '#e05c5c', 'health'),
    (p_profile_id, 'Utilities', '#e09a5c', 'utilities'),
    (p_profile_id, 'Shopping', '#7a6ec8', 'shopping'),
    (p_profile_id, 'Other', '#6e8899', 'other')
  on conflict (profile_id, system_key) do nothing;
end;
$$;

create or replace function public.seed_default_categories_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.seed_default_categories_for_profile(new.id);
  return new;
end;
$$;

drop trigger if exists seed_default_categories_after_profile_insert on public.profiles;
create trigger seed_default_categories_after_profile_insert
after insert on public.profiles
for each row
execute function public.seed_default_categories_trigger();

grant execute on function public.seed_default_categories_for_profile(uuid) to authenticated;
