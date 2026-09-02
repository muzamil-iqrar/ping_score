import { supabase } from './supabase';
import { Match, Player, Tournament, TournamentEntry, TournamentMatch } from './types';
import { generateRoundRobinFixtures } from '../state/tournamentEngine';

export async function fetchPlayers(): Promise<Player[]> {
  const { data, error } = await supabase.from('players').select('*').order('name');
  if (error) throw error;
  return data;
}

export async function addPlayer(name: string, icon: string): Promise<Player> {
  const { data, error } = await supabase.from('players').insert({ name, icon }).select().single();
  if (error) throw error;
  return data;
}

export async function removePlayer(id: string): Promise<void> {
  const { error } = await supabase.from('players').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchMatches(): Promise<Match[]> {
  const { data, error } = await supabase.from('matches').select('*').order('played_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function recordMatch(match: Omit<Match, 'id' | 'played_at'>): Promise<Match> {
  const { data, error } = await supabase.from('matches').insert(match).select().single();
  if (error) throw error;
  return data;
}

type TournamentSettings = Pick<Tournament, 'name' | 'mode' | 'point_target' | 'serve_interval' | 'matches_per_opponent'>;

export async function createTournament(settings: TournamentSettings, teams: string[][]): Promise<Tournament> {
  const { data: tournament, error: tournamentError } = await supabase
    .from('tournaments')
    .insert(settings)
    .select()
    .single();
  if (tournamentError) throw tournamentError;

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

  return tournament;
}

export async function fetchTournaments(): Promise<Tournament[]> {
  const { data, error } = await supabase.from('tournaments').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchTournament(tournamentId: string): Promise<{
  tournament: Tournament;
  entries: TournamentEntry[];
  matches: TournamentMatch[];
}> {
  const [tournamentResult, entriesResult, matchesResult] = await Promise.all([
    supabase.from('tournaments').select('*').eq('id', tournamentId).single(),
    supabase.from('tournament_entries').select('*').eq('tournament_id', tournamentId).order('entry_order'),
    supabase.from('tournament_matches').select('*').eq('tournament_id', tournamentId).order('round_number'),
  ]);

  if (tournamentResult.error) throw tournamentResult.error;
  if (entriesResult.error) throw entriesResult.error;
  if (matchesResult.error) throw matchesResult.error;

  return { tournament: tournamentResult.data, entries: entriesResult.data, matches: matchesResult.data };
}

export async function recordTournamentMatchResult(
  tournamentMatchId: string,
  result: Pick<TournamentMatch, 'team_a_score' | 'team_b_score' | 'winner_entry_id'>
): Promise<void> {
  const { error } = await supabase
    .from('tournament_matches')
    .update({ ...result, played_at: new Date().toISOString() })
    .eq('id', tournamentMatchId);
  if (error) throw error;
}
