-- ============================================================================
-- FinTrack — Migration 004: Fix structural issues in existing tables
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1. FIX: Replace partial unique index on categories.system_key with a
--    proper unique constraint. A regular UNIQUE constraint allows multiple
--    NULLs (user categories) while preventing duplicate system_keys per profile.
-- ────────────────────────────────────────────────────────────────────────────

drop index if exists public.categories_profile_system_key_idx;

alter table public.categories
  add constraint categories_profile_system_key_key
  unique (profile_id, system_key);

-- ────────────────────────────────────────────────────────────────────────────
-- 2. FIX: Drop redundant case-sensitive unique constraints.
--    The case-insensitive unique indexes already cover these more strictly.
-- ────────────────────────────────────────────────────────────────────────────

alter table public.profiles
  drop constraint if exists profiles_owner_name_key;

alter table public.categories
  drop constraint if exists categories_profile_name_key;

-- ────────────────────────────────────────────────────────────────────────────
-- 3. FIX: Add missing index on expenses.category_id for faster lookups
--    when reassigning categories during deletion.
-- ────────────────────────────────────────────────────────────────────────────

create index if not exists expenses_category_id_idx
  on public.expenses (category_id);

-- ────────────────────────────────────────────────────────────────────────────
-- 4. FIX: Add updated_at column + auto-update trigger on expenses table
--    to track when expenses are last modified.
-- ────────────────────────────────────────────────────────────────────────────

alter table public.expenses
  add column if not exists updated_at timestamptz not null default now();

-- Backfill: set updated_at = created_at for existing rows
update public.expenses
  set updated_at = created_at
  where updated_at = now();

drop trigger if exists set_expenses_updated_at on public.expenses;
create trigger set_expenses_updated_at
before update on public.expenses
for each row
execute function public.set_updated_at();

-- ────────────────────────────────────────────────────────────────────────────
-- 5. SECURITY FIX: Replace seed_default_categories_for_profile() with a
--    version that verifies the caller owns the target profile.
--    Prevents authenticated users from inserting into other users' profiles.
-- ────────────────────────────────────────────────────────────────────────────

create or replace function public.seed_default_categories_for_profile(p_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
begin
  -- Verify the calling user owns this profile
  select owner_user_id into v_owner
  from public.profiles
  where id = p_profile_id;

  if v_owner is null then
    raise exception 'Profile not found: %', p_profile_id;
  end if;

  if v_owner <> auth.uid() then
    raise exception 'Access denied: you do not own this profile';
  end if;

  insert into public.categories (profile_id, name, color, system_key)
  values
    (p_profile_id, 'Housing',       '#c8a96e', 'housing'),
    (p_profile_id, 'Food',          '#5cbb8a', 'food'),
    (p_profile_id, 'Transport',     '#5c9abb', 'transport'),
    (p_profile_id, 'Entertainment', '#bb5caa', 'entertainment'),
    (p_profile_id, 'Health',        '#e05c5c', 'health'),
    (p_profile_id, 'Utilities',     '#e09a5c', 'utilities'),
    (p_profile_id, 'Shopping',      '#7a6ec8', 'shopping'),
    (p_profile_id, 'Other',         '#6e8899', 'other')
  on conflict (profile_id, system_key) do nothing;
end;
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- 6. FIX: Update the trigger function to also include the ownership check.
--    The trigger runs as SECURITY DEFINER so it bypasses auth.uid(), but
--    since it fires on INSERT to profiles, the RLS policy already ensures
--    only the owner can insert. We keep it as-is but add a safety comment.
-- ────────────────────────────────────────────────────────────────────────────

create or replace function public.seed_default_categories_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- This trigger fires AFTER INSERT on profiles.
  -- RLS on profiles already guarantees owner_user_id = auth.uid(),
  -- so we can safely insert categories without re-checking ownership.
  insert into public.categories (profile_id, name, color, system_key)
  values
    (new.id, 'Housing',       '#c8a96e', 'housing'),
    (new.id, 'Food',          '#5cbb8a', 'food'),
    (new.id, 'Transport',     '#5c9abb', 'transport'),
    (new.id, 'Entertainment', '#bb5caa', 'entertainment'),
    (new.id, 'Health',        '#e05c5c', 'health'),
    (new.id, 'Utilities',     '#e09a5c', 'utilities'),
    (new.id, 'Shopping',      '#7a6ec8', 'shopping'),
    (new.id, 'Other',         '#6e8899', 'other')
  on conflict (profile_id, system_key) do nothing;
  return new;
end;
$$;

-- Ensure the trigger still exists
drop trigger if exists seed_default_categories_after_profile_insert on public.profiles;
create trigger seed_default_categories_after_profile_insert
after insert on public.profiles
for each row
execute function public.seed_default_categories_trigger();

-- ────────────────────────────────────────────────────────────────────────────
-- 7. FIX: Tighten the expenses RLS policy to also allow updates to the
--    updated_at column (already covered by the existing "for all" policy,
--    but we verify it's still in place).
-- ────────────────────────────────────────────────────────────────────────────

-- (No change needed — the existing expenses_owner_all policy uses FOR ALL
--  which covers SELECT, INSERT, UPDATE, DELETE including the new column.)

-- ============================================================================
-- VERIFICATION QUERIES — Run these after the migration to confirm everything.
-- ============================================================================

-- Check the new constraint exists:
-- select conname from pg_constraint where conrelid = 'public.categories'::regclass;

-- Check the old constraints are gone:
-- select conname from pg_constraint where conrelid = 'public.profiles'::regclass;

-- Check new index exists:
-- select indexname from pg_indexes where tablename = 'expenses' and indexname = 'expenses_category_id_idx';

-- Check updated_at column exists:
-- select column_name, data_type from information_schema.columns
-- where table_name = 'expenses' and column_name = 'updated_at';
