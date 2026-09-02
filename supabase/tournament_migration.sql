-- Run this once in the Supabase SQL editor if you already set up the app.

create table tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  mode text not null check (mode in ('singles', 'doubles')),
  point_target integer not null check (point_target in (10, 20)),
  serve_interval integer not null check (serve_interval in (1, 2, 5)),
  matches_per_opponent integer not null default 1 check (matches_per_opponent in (1, 2, 3)),
  created_at timestamptz not null default now()
);

create table tournament_entries (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  player_ids uuid[] not null,
  entry_order integer not null,
  unique (tournament_id, entry_order)
);

create table tournament_matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  round_number integer not null check (round_number > 0),
  team_a_entry_id uuid not null references tournament_entries(id) on delete cascade,
  team_b_entry_id uuid not null references tournament_entries(id) on delete cascade,
  team_a_score integer check (team_a_score >= 0),
  team_b_score integer check (team_b_score >= 0),
  winner_entry_id uuid references tournament_entries(id) on delete set null,
  played_at timestamptz,
  created_at timestamptz not null default now(),
  check (team_a_entry_id <> team_b_entry_id),
  check (
    (team_a_score is null and team_b_score is null and winner_entry_id is null)
    or (team_a_score is not null and team_b_score is not null and winner_entry_id in (team_a_entry_id, team_b_entry_id))
  )
);

create index tournament_entries_tournament_id_idx on tournament_entries(tournament_id);
create index tournament_matches_tournament_round_idx on tournament_matches(tournament_id, round_number);

alter table tournaments enable row level security;
alter table tournament_entries enable row level security;
alter table tournament_matches enable row level security;

create policy "authenticated full access" on tournaments
  for all to authenticated using (true) with check (true);

create policy "authenticated full access" on tournament_entries
  for all to authenticated using (true) with check (true);

create policy "authenticated full access" on tournament_matches
  for all to authenticated using (true) with check (true);
