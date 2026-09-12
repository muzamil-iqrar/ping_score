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

alter table players enable row level security;
alter table matches enable row level security;
alter table tournaments enable row level security;
alter table tournament_entries enable row level security;
alter table tournament_matches enable row level security;

-- Single shared login: any authenticated user can do anything.
create policy "authenticated full access" on players
  for all to authenticated using (true) with check (true);

create policy "authenticated full access" on matches
  for all to authenticated using (true) with check (true);

create policy "authenticated full access" on tournaments
  for all to authenticated using (true) with check (true);

create policy "authenticated full access" on tournament_entries
  for all to authenticated using (true) with check (true);

create policy "authenticated full access" on tournament_matches
  for all to authenticated using (true) with check (true);

-- Creates the tournament, entries, and fixtures in one transaction.
create or replace function public.create_tournament_with_fixtures(
  p_name text,
  p_mode text,
  p_point_target integer,
  p_serve_interval integer,
  p_matches_per_opponent integer,
  p_teams jsonb,
  p_fixtures jsonb
)
returns public.tournaments
language plpgsql
security invoker
set search_path = public
as $$
declare
  created_tournament public.tournaments;
  expected_team_size integer;
  inserted_fixture_count integer;
begin
  if p_mode not in ('singles', 'doubles') then
    raise exception 'Invalid tournament mode';
  end if;

  expected_team_size := case when p_mode = 'singles' then 1 else 2 end;

  if jsonb_typeof(p_teams) <> 'array' or jsonb_array_length(p_teams) < 2 then
    raise exception 'A tournament needs at least two entries';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_teams) as team(value)
    where jsonb_typeof(team.value) <> 'array'
      or jsonb_array_length(team.value) <> expected_team_size
  ) then
    raise exception 'Each entry has the wrong number of players';
  end if;

  if jsonb_typeof(p_fixtures) <> 'array' or jsonb_array_length(p_fixtures) = 0 then
    raise exception 'A tournament needs at least one fixture';
  end if;

  insert into public.tournaments (
    name,
    mode,
    point_target,
    serve_interval,
    matches_per_opponent
  )
  values (
    trim(p_name),
    p_mode,
    p_point_target,
    p_serve_interval,
    p_matches_per_opponent
  )
  returning * into created_tournament;

  insert into public.tournament_entries (
    tournament_id,
    player_ids,
    entry_order
  )
  select
    created_tournament.id,
    array(
      select player_id::uuid
      from jsonb_array_elements_text(team.value) as player(player_id)
    ),
    (team.ordinality - 1)::integer
  from jsonb_array_elements(p_teams) with ordinality as team(value, ordinality);

  insert into public.tournament_matches (
    tournament_id,
    round_number,
    team_a_entry_id,
    team_b_entry_id
  )
  select
    created_tournament.id,
    (fixture.value ->> 'round_number')::integer,
    team_a.id,
    team_b.id
  from jsonb_array_elements(p_fixtures) as fixture(value)
  join public.tournament_entries as team_a
    on team_a.tournament_id = created_tournament.id
   and team_a.entry_order = (fixture.value ->> 'team_a_order')::integer
  join public.tournament_entries as team_b
    on team_b.tournament_id = created_tournament.id
   and team_b.entry_order = (fixture.value ->> 'team_b_order')::integer;

  get diagnostics inserted_fixture_count = row_count;
  if inserted_fixture_count <> jsonb_array_length(p_fixtures) then
    raise exception 'One or more fixtures reference an invalid entry';
  end if;

  return created_tournament;
end;
$$;

revoke all on function public.create_tournament_with_fixtures(text, text, integer, integer, integer, jsonb, jsonb) from public;
grant execute on function public.create_tournament_with_fixtures(text, text, integer, integer, integer, jsonb, jsonb) to authenticated;
