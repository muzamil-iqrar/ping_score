-- Run this once if you already ran tournament_migration.sql.

alter table tournaments
  add column if not exists matches_per_opponent integer not null default 1 check (matches_per_opponent in (1, 2, 3));
