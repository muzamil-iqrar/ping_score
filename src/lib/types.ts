export type Player = {
  id: string;
  name: string;
  icon: string;
  created_at: string;
};

export type MatchMode = 'singles' | 'doubles';

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
