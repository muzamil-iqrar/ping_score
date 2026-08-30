-- Table Tennis Scoreboard schema.
-- Single shared login: every row is visible/editable by any authenticated user.
-- Run this in the Supabase SQL editor for your project.

create table players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  icon text not null default '🏓',
  created_at timestamptz not null default now()
);

create table matches (
  id uuid primary key default gen_random_uuid(),
  mode text not null check (mode in ('singles', 'doubles')),
  point_target integer not null check (point_target in (10, 20)),
  team_a_player_ids uuid[] not null,
  team_b_player_ids uuid[] not null,
  team_a_score integer not null,
  team_b_score integer not null,
  winner text not null check (winner in ('a', 'b')),
  played_at timestamptz not null default now()
);

alter table players enable row level security;
alter table matches enable row level security;

-- Single shared login: any authenticated user can do anything.
create policy "authenticated full access" on players
  for all to authenticated using (true) with check (true);

create policy "authenticated full access" on matches
  for all to authenticated using (true) with check (true);
