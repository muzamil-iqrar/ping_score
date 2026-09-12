-- Optional rollback. The app will use its compatibility path after this function is removed.
drop function if exists public.create_tournament_with_fixtures(text, text, integer, integer, integer, jsonb, jsonb);
