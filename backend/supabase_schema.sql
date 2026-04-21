-- ============================================
-- DeadlineMe Database Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ============================================
-- PROFILES (extends Supabase auth.users)
-- ============================================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  display_name text,
  avatar_url text,
  streak integer default 0,
  total_staked integer default 0,
  total_saved integer default 0,
  total_lost integer default 0,
  stakes_completed integer default 0,
  stakes_failed integer default 0,
  is_pro boolean default false,
  stripe_customer_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    split_part(new.email, '@', 1)
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================
-- STAKES (core table)
-- ============================================
create table public.stakes (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text,
  category text not null,
  stake_amount integer not null check (stake_amount >= 1 and stake_amount <= 500),
  deadline timestamptz not null,
  anti_charity_id text not null,
  anti_charity_name text not null,
  status text default 'active' check (status in ('active', 'completed', 'failed', 'pending_verification')),
  proof_url text,
  verification_result text,
  stripe_payment_intent_id text,
  created_at timestamptz default now(),
  completed_at timestamptz,
  updated_at timestamptz default now()
);

-- Index for fast lookups
create index idx_stakes_user_id on public.stakes(user_id);
create index idx_stakes_status on public.stakes(status);
create index idx_stakes_deadline on public.stakes(deadline);
create index idx_stakes_user_status on public.stakes(user_id, status);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Profiles: users can only read/update their own
alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Stakes: users can only access their own
alter table public.stakes enable row level security;

create policy "Users can view own stakes"
  on public.stakes for select
  using (auth.uid() = user_id);

create policy "Users can create stakes"
  on public.stakes for insert
  with check (auth.uid() = user_id);

create policy "Users can update own stakes"
  on public.stakes for update
  using (auth.uid() = user_id);

-- ============================================
-- STORAGE BUCKET (for proof images)
-- ============================================
insert into storage.buckets (id, name, public)
values ('proofs', 'proofs', true)
on conflict do nothing;

create policy "Users can upload proof images"
  on storage.objects for insert
  with check (bucket_id = 'proofs' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Anyone can view proof images"
  on storage.objects for select
  using (bucket_id = 'proofs');

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Increment a numeric field (used for stats updates)
create or replace function increment_field(row_id uuid, field_name text, amount integer)
returns void as $$
begin
  execute format(
    'update public.profiles set %I = %I + $1 where id = $2',
    field_name, field_name
  ) using amount, row_id;
end;
$$ language plpgsql security definer;

-- Auto-update updated_at timestamp
create or replace function update_modified_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_profiles_modtime
  before update on public.profiles
  for each row execute function update_modified_column();

create trigger update_stakes_modtime
  before update on public.stakes
  for each row execute function update_modified_column();
