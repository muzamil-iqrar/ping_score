# Table Tennis Scoreboard

Track singles/doubles table tennis matches: point tracking to 10 or 20 (win by 2), automatic server rotation (including the full 4-player doubles rotation), player roster, match history, and singles or doubles round-robin tournaments. One shared login for you and your teammate.

## Setup

1. Create a free project at [supabase.com](https://supabase.com).
2. In the Supabase SQL editor, run [`supabase/schema.sql`](supabase/schema.sql).
3. In Supabase → Authentication → Users, manually create one user (email + password) — this is the shared login you and your teammate will both use.
4. Copy `.env.example` to `.env` and fill in your project's URL and anon key (Supabase → Project Settings → API).
5. `npm install`
6. `npx expo start` — scan the QR code with Expo Go on your phone, or press `i`/`a` for a simulator.

If the app was already set up, run [`supabase/tournament_migration.sql`](supabase/tournament_migration.sql) in the Supabase SQL editor before using Tournament mode. If you ran that migration before the matches-per-opponent setting was added, also run [`supabase/tournament_settings_migration.sql`](supabase/tournament_settings_migration.sql).

## Structure

- `src/state/matchEngine.ts` — pure scoring/serve-rotation logic (run `npx tsx src/state/matchEngine.test.ts` to verify).
- `src/state/tournamentEngine.ts` — pure round-robin fixture and standings logic (run `npx tsx src/state/tournamentEngine.test.ts` to verify).
- `src/screens/` — app screens.
- `src/lib/api.ts` — Supabase reads/writes.
- `supabase/schema.sql` — database schema (run once in Supabase).
