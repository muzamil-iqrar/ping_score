export type Player = {
  id: string;
  name: string;
  icon: string;
  created_at: string;
};

export type MatchMode = 'singles' | 'doubles';

export type Tournament = {
  id: string;
  name: string;
  mode: MatchMode;
  point_target: 10 | 20;
  serve_interval: number;
  matches_per_opponent: 1 | 2 | 3;
  created_at: string;
};

export type TournamentEntry = {
  id: string;
  tournament_id: string;
  player_ids: string[];
  entry_order: number;
};

export type TournamentMatch = {
  id: string;
  tournament_id: string;
  round_number: number;
  team_a_entry_id: string;
  team_b_entry_id: string;
  team_a_score: number | null;
  team_b_score: number | null;
  winner_entry_id: string | null;
  played_at: string | null;
  created_at: string;
};

export type Match = {
  id: string;
  mode: MatchMode;
  point_target: 10 | 20;
  team_a_player_ids: string[];
  team_b_player_ids: string[];
  team_a_score: number;
  team_b_score: number;
  winner: 'a' | 'b';
  played_at: string;
};

export const PLAYER_ICONS = [
  '🏓', '🔥', '⚡', '🐉', '🦁', '🐯', '🦈', '🐻',
  '🚀', '👑', '💪', '🎯', '⭐', '🍀', '🥷', '🤖',
];
