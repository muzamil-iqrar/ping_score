import { supabase } from './supabase';
import { Match, Player } from './types';

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
