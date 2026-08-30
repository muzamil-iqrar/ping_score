import { MatchMode } from '../lib/types';

export type Team = 'a' | 'b';

/** Doubles serve rotation cycles through these 4 (server, receiver) pairs, in order. */
const DOUBLES_ROTATION: Array<{ server: Team; serverSlot: 0 | 1; receiver: Team; receiverSlot: 0 | 1 }> = [
  { server: 'a', serverSlot: 0, receiver: 'b', receiverSlot: 0 },
  { server: 'b', serverSlot: 0, receiver: 'a', receiverSlot: 1 },
  { server: 'a', serverSlot: 1, receiver: 'b', receiverSlot: 1 },
  { server: 'b', serverSlot: 1, receiver: 'a', receiverSlot: 0 },
];

export type MatchState = {
  mode: MatchMode;
  pointTarget: number;
  /** Points played per turn before serve switches (every 1 point once in the deuce zone). Defaults to 2. */
  serveInterval: number;
  scoreA: number;
  scoreB: number;
  /** Total points played so far; drives whose turn it is to serve. */
  pointsPlayed: number;
  /** Index into DOUBLES_ROTATION for the *first* server of the match. Fixed per match. */
  firstServerRotationIndex: number;
  /** In singles: which team served first. */
  firstServerTeam: Team;
  winner: Team | null;
  /** Team that scored the most recent point, for undo. Null if no points played. */
  lastScoringTeam: Team | null;
};

export function createMatch(mode: MatchMode, pointTarget: number, serveInterval: number = 2): MatchState {
  return {
    mode,
    pointTarget,
    serveInterval,
    scoreA: 0,
    scoreB: 0,
    pointsPlayed: 0,
    firstServerRotationIndex: 0,
    firstServerTeam: 'a',
    winner: null,
    lastScoringTeam: null,
  };
}

function isDeuceZone(scoreA: number, scoreB: number, pointTarget: number): boolean {
  return scoreA >= pointTarget - 1 && scoreB >= pointTarget - 1;
}

/** How many total points have been played when the serve last changed, given the switch-every-N (or every-1 at deuce) rule. */
function serveTurnIndex(pointsPlayed: number, scoreA: number, scoreB: number, pointTarget: number, serveInterval: number): number {
  if (isDeuceZone(scoreA, scoreB, pointTarget)) {
    // Every point up to deuce entry used the every-N rule; after that, every 1.
    const pointsBeforeDeuce = serveInterval * (pointTarget - 1);
    const pointsSinceDeuce = pointsPlayed - pointsBeforeDeuce;
    return Math.floor(pointsBeforeDeuce / serveInterval) + pointsSinceDeuce;
  }
  return Math.floor(pointsPlayed / serveInterval);
}

export type ServerInfo = {
  team: Team;
  /** Which slot (0 or 1) within the team is serving — only meaningful in doubles. */
  slot: 0 | 1;
};

export function currentServer(state: MatchState): ServerInfo {
  const turn = serveTurnIndex(state.pointsPlayed, state.scoreA, state.scoreB, state.pointTarget, state.serveInterval);

  if (state.mode === 'singles') {
    const team: Team = turn % 2 === 0 ? state.firstServerTeam : opponent(state.firstServerTeam);
    return { team, slot: 0 };
  }

  const rotationIndex = (state.firstServerRotationIndex + turn) % 4;
  const { server, serverSlot } = DOUBLES_ROTATION[rotationIndex];
  return { team: server, slot: serverSlot };
}

function opponent(team: Team): Team {
  return team === 'a' ? 'b' : 'a';
}

export function scorePoint(state: MatchState, team: Team): MatchState {
  if (state.winner) return state;

  const scoreA = team === 'a' ? state.scoreA + 1 : state.scoreA;
  const scoreB = team === 'b' ? state.scoreB + 1 : state.scoreB;
  const pointsPlayed = state.pointsPlayed + 1;

  const winner = computeWinner(scoreA, scoreB, state.pointTarget);

  return { ...state, scoreA, scoreB, pointsPlayed, winner, lastScoringTeam: team };
}

function computeWinner(scoreA: number, scoreB: number, pointTarget: number): Team | null {
  if (scoreA >= pointTarget && scoreA - scoreB >= 2) return 'a';
  if (scoreB >= pointTarget && scoreB - scoreA >= 2) return 'b';
  return null;
}

/** Undo the most recently scored point (for correcting mis-taps). No-op if no points played yet. */
export function undoPoint(state: MatchState): MatchState {
  const team = state.lastScoringTeam;
  if (!team) return state;
  const scoreA = team === 'a' ? state.scoreA - 1 : state.scoreA;
  const scoreB = team === 'b' ? state.scoreB - 1 : state.scoreB;
  return {
    ...state,
    scoreA,
    scoreB,
    pointsPlayed: state.pointsPlayed - 1,
    winner: null,
    lastScoringTeam: null,
  };
}
