create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  currency text not null default '$',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_owner_name_key unique (owner_user_id, name)
);

create unique index if not exists profiles_owner_name_ci_idx
  on public.profiles (owner_user_id, lower(name));

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  color text not null,
  system_key text,
  created_at timestamptz not null default now(),
  constraint categories_profile_name_key unique (profile_id, name)
);

create unique index if not exists categories_profile_name_ci_idx
  on public.categories (profile_id, lower(name));

create unique index if not exists categories_profile_system_key_idx
  on public.categories (profile_id, system_key)
  where system_key is not null;

create table if not exists public.monthly_stats (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  month_key text not null,
  budget numeric(12, 2) not null default 0 check (budget >= 0),
  income numeric(12, 2) not null default 0 check (income >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (profile_id, month_key),
  constraint monthly_stats_month_key_format check (month_key ~ '^[0-9]{4}-(0[1-9]|1[0-2])$')
);

drop trigger if exists set_monthly_stats_updated_at on public.monthly_stats;
create trigger set_monthly_stats_updated_at
before update on public.monthly_stats
for each row
execute function public.set_updated_at();

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  amount numeric(12, 2) not null check (amount > 0),
  date date not null,
  created_at timestamptz not null default now()
);

create index if not exists expenses_profile_date_idx
  on public.expenses (profile_id, date);

create index if not exists expenses_profile_created_idx
  on public.expenses (profile_id, created_at desc);
