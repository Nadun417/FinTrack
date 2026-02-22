alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.monthly_stats enable row level security;
alter table public.expenses enable row level security;

drop policy if exists profiles_owner_all on public.profiles;
create policy profiles_owner_all
on public.profiles
for all
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

drop policy if exists categories_owner_all on public.categories;
create policy categories_owner_all
on public.categories
for all
using (
  exists (
    select 1
    from public.profiles p
    where p.id = categories.profile_id
      and p.owner_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = categories.profile_id
      and p.owner_user_id = auth.uid()
  )
);

drop policy if exists monthly_stats_owner_all on public.monthly_stats;
create policy monthly_stats_owner_all
on public.monthly_stats
for all
using (
  exists (
    select 1
    from public.profiles p
    where p.id = monthly_stats.profile_id
      and p.owner_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = monthly_stats.profile_id
      and p.owner_user_id = auth.uid()
  )
);

drop policy if exists expenses_owner_all on public.expenses;
create policy expenses_owner_all
on public.expenses
for all
using (
  exists (
    select 1
    from public.profiles p
    where p.id = expenses.profile_id
      and p.owner_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = expenses.profile_id
      and p.owner_user_id = auth.uid()
  )
);
