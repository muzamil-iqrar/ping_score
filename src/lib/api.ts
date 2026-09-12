import { supabase } from './supabase';
import { Match, Player, Tournament, TournamentEntry, TournamentMatch } from './types';
import { generateRoundRobinFixtures } from '../state/tournamentEngine';

const CACHE_TTL_MS = 30_000;

type CacheOptions = { force?: boolean };
type CacheEntry<T> = { value: T; expiresAt: number };

const cache = new Map<string, CacheEntry<unknown>>();
const pendingRequests = new Map<string, Promise<unknown>>();
let cacheGeneration = 0;

async function readThroughCache<T>(key: string, load: () => Promise<T>, force = false): Promise<T> {
  const cached = cache.get(key) as CacheEntry<T> | undefined;
  if (!force && cached && cached.expiresAt > Date.now()) return cached.value;

  const pending = pendingRequests.get(key) as Promise<T> | undefined;
  if (!force && pending) return pending;

  const requestGeneration = cacheGeneration;
  const request = load()
    .then((value) => {
      if (requestGeneration === cacheGeneration && pendingRequests.get(key) === request) {
        cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
      }
      return value;
    })
    .finally(() => {
      if (pendingRequests.get(key) === request) pendingRequests.delete(key);
    });
  pendingRequests.set(key, request);
  return request;
}

function invalidateCache(...prefixes: string[]) {
  for (const key of cache.keys()) {
    if (prefixes.some((prefix) => key === prefix || key.startsWith(`${prefix}:`))) cache.delete(key);
  }
  for (const key of pendingRequests.keys()) {
    if (prefixes.some((prefix) => key === prefix || key.startsWith(`${prefix}:`))) pendingRequests.delete(key);
  }
}

export function clearApiCache() {
  cacheGeneration += 1;
  cache.clear();
  pendingRequests.clear();
}

export async function fetchPlayers({ force = false }: CacheOptions = {}): Promise<Player[]> {
  return readThroughCache('players', async () => {
    const { data, error } = await supabase.from('players').select('*').order('name');
    if (error) throw error;
    return data;
  }, force);
}

export async function addPlayer(name: string, icon: string): Promise<Player> {
  const { data, error } = await supabase.from('players').insert({ name, icon }).select().single();
  if (error) throw error;
  invalidateCache('players');
  return data;
}

export async function removePlayer(id: string): Promise<void> {
  const { error } = await supabase.from('players').delete().eq('id', id);
  if (error) throw error;
  invalidateCache('players');
}

export async function fetchMatches({ force = false }: CacheOptions = {}): Promise<Match[]> {
  return readThroughCache('matches', async () => {
    const { data, error } = await supabase.from('matches').select('*').order('played_at', { ascending: false });
    if (error) throw error;
    return data;
  }, force);
}

export async function fetchRecentMatches(limit = 3, { force = false }: CacheOptions = {}): Promise<Match[]> {
  return readThroughCache(`matches:recent:${limit}`, async () => {
    const { data, error } = await supabase.from('matches').select('*').order('played_at', { ascending: false }).limit(limit);
    if (error) throw error;
    return data;
  }, force);
}

export async function recordMatch(match: Omit<Match, 'id' | 'played_at'>): Promise<Match> {
  const { data, error } = await supabase.from('matches').insert(match).select().single();
  if (error) throw error;
  invalidateCache('matches');
  return data;
}

export async function deleteMatch(id: string): Promise<void> {
  const { error } = await supabase.from('matches').delete().eq('id', id);
  if (error) throw error;
  invalidateCache('matches');
}

type TournamentSettings = Pick<Tournament, 'name' | 'mode' | 'point_target' | 'serve_interval' | 'matches_per_opponent'>;

export async function createTournament(settings: TournamentSettings, teams: string[][]): Promise<Tournament> {
  const fixturePlan = generateRoundRobinFixtures(teams.map((_, index) => String(index)), settings.matches_per_opponent);
  const { data: atomicTournament, error: atomicError } = await supabase
    .rpc('create_tournament_with_fixtures', {
      p_name: settings.name,
      p_mode: settings.mode,
      p_point_target: settings.point_target,
      p_serve_interval: settings.serve_interval,
      p_matches_per_opponent: settings.matches_per_opponent,
      p_teams: teams,
      p_fixtures: fixturePlan.map((fixture) => ({
        round_number: fixture.roundNumber,
        team_a_order: Number(fixture.teamAId),
        team_b_order: Number(fixture.teamBId),
      })),
    })
    .single();

  if (!atomicError) {
    invalidateCache('tournaments');
    return atomicTournament as Tournament;
  }

  const functionUnavailable = atomicError.code === 'PGRST202' || atomicError.message.includes('create_tournament_with_fixtures');
  if (!functionUnavailable) throw atomicError;

  // Compatibility path for deployments that have not run the atomic migration yet.
  const { data: tournament, error: tournamentError } = await supabase
    .from('tournaments')
    .insert(settings)
    .select()
    .single();
  if (tournamentError) throw tournamentError;

  try {
    const { data: entries, error: entriesError } = await supabase
      .from('tournament_entries')
      .insert(teams.map((playerIds, entryOrder) => ({ tournament_id: tournament.id, player_ids: playerIds, entry_order: entryOrder })))
      .select()
      .order('entry_order');
    if (entriesError) throw entriesError;

    const fixtures = generateRoundRobinFixtures(entries.map((entry) => entry.id), tournament.matches_per_opponent);
    const { error: fixturesError } = await supabase.from('tournament_matches').insert(
      fixtures.map((fixture) => ({
        tournament_id: tournament.id,
        round_number: fixture.roundNumber,
        team_a_entry_id: fixture.teamAId,
        team_b_entry_id: fixture.teamBId,
      }))
    );
    if (fixturesError) throw fixturesError;
  } catch (error) {
    const { error: cleanupError } = await supabase.from('tournaments').delete().eq('id', tournament.id);
    if (cleanupError) throw new Error(`${error instanceof Error ? error.message : 'Tournament creation failed'}. Cleanup also failed: ${cleanupError.message}`);
    throw error;
  }

  invalidateCache('tournaments');
  return tournament;
}

export async function fetchTournaments({ force = false }: CacheOptions = {}): Promise<Tournament[]> {
  return readThroughCache('tournaments', async () => {
    const { data, error } = await supabase.from('tournaments').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  }, force);
}

export async function deleteTournament(id: string): Promise<void> {
  const { error } = await supabase.from('tournaments').delete().eq('id', id);
  if (error) throw error;
  invalidateCache('tournaments', `tournament:${id}`);
}

export async function fetchTournament(tournamentId: string): Promise<{
  tournament: Tournament;
  entries: TournamentEntry[];
  matches: TournamentMatch[];
}> {
  return readThroughCache(`tournament:${tournamentId}`, async () => {
    const [tournamentResult, entriesResult, matchesResult] = await Promise.all([
      supabase.from('tournaments').select('*').eq('id', tournamentId).single(),
      supabase.from('tournament_entries').select('*').eq('tournament_id', tournamentId).order('entry_order'),
      supabase.from('tournament_matches').select('*').eq('tournament_id', tournamentId).order('round_number'),
    ]);

    if (tournamentResult.error) throw tournamentResult.error;
    if (entriesResult.error) throw entriesResult.error;
    if (matchesResult.error) throw matchesResult.error;

    return { tournament: tournamentResult.data, entries: entriesResult.data, matches: matchesResult.data };
  });
}

export async function recordTournamentMatchResult(
  tournamentMatchId: string,
  result: Pick<TournamentMatch, 'team_a_score' | 'team_b_score' | 'winner_entry_id'>
): Promise<void> {
  // Only write if the fixture is still unplayed, so two concurrent plays of the same
  // fixture (e.g. a double-tap into LiveMatch) can't silently overwrite each other.
  const { data, error } = await supabase
    .from('tournament_matches')
    .update({ ...result, played_at: new Date().toISOString() })
    .eq('id', tournamentMatchId)
    .is('winner_entry_id', null)
    .select('tournament_id')
    .maybeSingle();
  if (error) throw error;
  if (data?.tournament_id) invalidateCache(`tournament:${data.tournament_id}`);
}
