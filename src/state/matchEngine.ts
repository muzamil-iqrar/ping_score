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
  firstServerRotationIndex: 0 | 1 | 2 | 3;
  /** In singles: which team served first. */
  firstServerTeam: Team;
  winner: Team | null;
  /** Every scored point, in order, so undo can step back more than once. */
  pointHistory: Team[];
  /** Team that scored the most recent remaining point. Null if no points remain. */
  lastScoringTeam: Team | null;
};

export function createMatch(
  mode: MatchMode,
  pointTarget: number,
  serveInterval: number = 2,
  firstServerRotationIndex: 0 | 1 | 2 | 3 = 0
): MatchState {
  return {
    mode,
    pointTarget,
    serveInterval,
    scoreA: 0,
    scoreB: 0,
    pointsPlayed: 0,
    firstServerRotationIndex,
    firstServerTeam: 'a',
    winner: null,
    pointHistory: [],
    lastScoringTeam: null,
  };
}

function isDeuceZone(scoreA: number, scoreB: number, pointTarget: number): boolean {
  return scoreA >= pointTarget - 1 && scoreB >= pointTarget - 1;
}

/** How many total points have been played when the serve last changed, given the switch-every-N (or every-1 at deuce) rule. */
function serveTurnIndex(pointsPlayed: number, scoreA: number, scoreB: number, pointTarget: number, serveInterval: number): number {
  if (isDeuceZone(scoreA, scoreB, pointTarget)) {
    // Deuce zone (both sides >= pointTarget - 1) is first reached after exactly 2*(pointTarget-1)
    // points, regardless of path. Every point up to there used the every-N rule; after that, every 1.
    const pointsBeforeDeuce = 2 * (pointTarget - 1);
    const turnsBeforeDeuce = Math.floor(pointsBeforeDeuce / serveInterval);
    const pointsSinceDeuce = pointsPlayed - pointsBeforeDeuce;
    return turnsBeforeDeuce + pointsSinceDeuce;
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

  return { ...state, scoreA, scoreB, pointsPlayed, winner, pointHistory: [...state.pointHistory, team], lastScoringTeam: team };
}

function computeWinner(scoreA: number, scoreB: number, pointTarget: number): Team | null {
  if (scoreA >= pointTarget && scoreA - scoreB >= 2) return 'a';
  if (scoreB >= pointTarget && scoreB - scoreA >= 2) return 'b';
  return null;
}

/** Undo the most recently scored point (for correcting mis-taps). No-op if no points played yet. */
export function undoPoint(state: MatchState): MatchState {
  const team = state.pointHistory[state.pointHistory.length - 1];
  if (!team) return state;
  const scoreA = team === 'a' ? state.scoreA - 1 : state.scoreA;
  const scoreB = team === 'b' ? state.scoreB - 1 : state.scoreB;
  const pointHistory = state.pointHistory.slice(0, -1);
  return {
    ...state,
    scoreA,
    scoreB,
    pointsPlayed: state.pointsPlayed - 1,
    winner: null,
    pointHistory,
    lastScoringTeam: pointHistory[pointHistory.length - 1] ?? null,
  };
}

/** Restart the current game at 0-0, keeping the format (mode, pointTarget, serveInterval). */
export function resetGame(state: MatchState): MatchState {
  return createMatch(state.mode, state.pointTarget, state.serveInterval, state.firstServerRotationIndex);
}

function mirroredFirstServerRotationIndex(state: MatchState): 0 | 1 | 2 | 3 {
  const turn = serveTurnIndex(state.pointsPlayed, state.scoreA, state.scoreB, state.pointTarget, state.serveInterval);
  const current = (state.firstServerRotationIndex + turn) % 4;
  // + 4 before the modulo because turn can exceed the mirrored index.
  return (((current ^ 1) - turn % 4 + 4) % 4) as 0 | 1 | 2 | 3;
}

/**
 * Mirror the match across the two sides: team A's score, points and serve turn become team B's
 * and vice versa. The same physical player keeps serving — only which side they're shown on changes.
 */
export function swapMatchSides(state: MatchState): MatchState {
  return {
    ...state,
    scoreA: state.scoreB,
    scoreB: state.scoreA,
    firstServerTeam: opponent(state.firstServerTeam),
    // currentServer() derives the live index as (firstServerRotationIndex + turn) % 4, so mirror
    // the *current* entry (0<->1, 2<->3 keeps the slot, flips the team) and take the turn back off
    // to get the first-server index that reproduces it.
    firstServerRotationIndex: mirroredFirstServerRotationIndex(state),
    winner: state.winner ? opponent(state.winner) : null,
    pointHistory: state.pointHistory.map(opponent),
    lastScoringTeam: state.lastScoringTeam ? opponent(state.lastScoringTeam) : null,
  };
}
