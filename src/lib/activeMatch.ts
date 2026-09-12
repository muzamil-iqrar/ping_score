import AsyncStorage from '@react-native-async-storage/async-storage';
import { MatchState, Team } from '../state/matchEngine';
import { MatchMode, Player } from './types';

export type ActiveMatchParams = {
  mode: MatchMode;
  pointTarget: 10 | 20;
  serveInterval: number;
  teamA: string[];
  teamB: string[];
  players: Player[];
  tournamentId?: string;
  tournamentMatchId?: string;
  teamAEntryId?: string;
  teamBEntryId?: string;
  firstServerRotationIndex?: 0 | 1 | 2 | 3;
};

export type ActiveMatchSnapshot = {
  version: 2;
  savedAt: string;
  match: MatchState;
  params: ActiveMatchParams;
};

let storageQueue = Promise.resolve<void>(undefined);

function enqueueStorageOperation<T>(operation: () => Promise<T>): Promise<T> {
  const result = storageQueue.catch(() => undefined).then(operation);
  storageQueue = result.then(() => undefined, () => undefined);
  return result;
}

function storageKey(userId: string) {
  return `@pingscore/active-match/${userId}`;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isPlayer(value: unknown): value is Player {
  if (!value || typeof value !== 'object') return false;
  const player = value as Partial<Player>;
  return typeof player.id === 'string' && typeof player.name === 'string' && typeof player.icon === 'string';
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === 'string';
}

function isNonnegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function isOptionalRotationIndex(value: unknown): value is 0 | 1 | 2 | 3 | undefined {
  return value === undefined || value === 0 || value === 1 || value === 2 || value === 3;
}

function isTeamArray(value: unknown): value is Team[] {
  return Array.isArray(value) && value.every((team) => team === 'a' || team === 'b');
}

function restoreLegacyPointHistory(scoreA: number, scoreB: number, lastScoringTeam: Team | null): Team[] {
  let remainingA = scoreA;
  let remainingB = scoreB;
  const history: Team[] = [];

  if (lastScoringTeam === 'a' && remainingA > 0) remainingA -= 1;
  if (lastScoringTeam === 'b' && remainingB > 0) remainingB -= 1;
  while (remainingA > 0 || remainingB > 0) {
    if (remainingA > 0) {
      history.push('a');
      remainingA -= 1;
    }
    if (remainingB > 0) {
      history.push('b');
      remainingB -= 1;
    }
  }
  if (lastScoringTeam && (lastScoringTeam === 'a' ? scoreA > 0 : scoreB > 0)) history.push(lastScoringTeam);
  return history;
}

function pointHistoryMatchesScores(pointHistory: Team[], scoreA: number, scoreB: number): boolean {
  return pointHistory.length === scoreA + scoreB
    && pointHistory.filter((team) => team === 'a').length === scoreA
    && pointHistory.filter((team) => team === 'b').length === scoreB;
}

function normalizeSnapshot(value: unknown): ActiveMatchSnapshot | null {
  if (!value || typeof value !== 'object') return null;
  const snapshot = value as Omit<Partial<ActiveMatchSnapshot>, 'version'> & { version?: number };
  const match = snapshot.match as (Partial<MatchState> & { pointHistory?: unknown }) | undefined;
  const params = snapshot.params as Partial<ActiveMatchParams> | undefined;
  const validBase = (snapshot.version === 1 || snapshot.version === 2)
    && typeof snapshot.savedAt === 'string'
    && Boolean(match)
    && (match?.mode === 'singles' || match?.mode === 'doubles')
    && isNonnegativeInteger(match?.scoreA)
    && isNonnegativeInteger(match?.scoreB)
    && isNonnegativeInteger(match?.pointsPlayed)
    && match.pointsPlayed === match.scoreA + match.scoreB
    && (match?.pointTarget === 10 || match?.pointTarget === 20)
    && (match?.serveInterval === 1 || match?.serveInterval === 2 || match?.serveInterval === 5)
    && Number.isInteger(match?.firstServerRotationIndex)
    && match.firstServerRotationIndex! >= 0
    && match.firstServerRotationIndex! <= 3
    && (match?.firstServerTeam === 'a' || match?.firstServerTeam === 'b')
    && (match?.winner === null || match?.winner === 'a' || match?.winner === 'b')
    && (match?.lastScoringTeam === null || match?.lastScoringTeam === 'a' || match?.lastScoringTeam === 'b')
    && Boolean(params)
    && (params?.mode === 'singles' || params?.mode === 'doubles')
    && (params?.pointTarget === 10 || params?.pointTarget === 20)
    && typeof params?.serveInterval === 'number'
    && isStringArray(params?.teamA)
    && isStringArray(params?.teamB)
    && params.teamA.length === (params.mode === 'singles' ? 1 : 2)
    && params.teamB.length === (params.mode === 'singles' ? 1 : 2)
    && Array.isArray(params?.players)
    && params.players.every(isPlayer)
    && isOptionalString(params.tournamentId)
    && isOptionalString(params.tournamentMatchId)
    && isOptionalString(params.teamAEntryId)
    && isOptionalString(params.teamBEntryId)
    && isOptionalRotationIndex(params.firstServerRotationIndex)
    && match?.mode === params.mode
    && match?.pointTarget === params.pointTarget
    && match?.serveInterval === params.serveInterval;

  if (!validBase || !match || !params) return null;

  const pointHistory = snapshot.version === 1 && match.pointHistory === undefined
    ? restoreLegacyPointHistory(match.scoreA!, match.scoreB!, match.lastScoringTeam ?? null)
    : match.pointHistory;
  if (!isTeamArray(pointHistory) || !pointHistoryMatchesScores(pointHistory, match.scoreA!, match.scoreB!)) return null;

  const lastScoringTeam = pointHistory[pointHistory.length - 1] ?? null;
  if (snapshot.version === 2 && match.lastScoringTeam !== lastScoringTeam) return null;

  return {
    version: 2,
    savedAt: snapshot.savedAt!,
    match: { ...match, pointHistory, lastScoringTeam } as MatchState,
    params: params as ActiveMatchParams,
  };
}

export async function loadActiveMatch(userId: string): Promise<ActiveMatchSnapshot | null> {
  return enqueueStorageOperation(async () => {
    const key = storageKey(userId);
    const stored = await AsyncStorage.getItem(key);
    if (!stored) return null;
    try {
      const value: unknown = JSON.parse(stored);
      const snapshot = normalizeSnapshot(value);
      if (snapshot) return snapshot;
    } catch {
      // Remove unreadable state so it cannot break every future resume attempt.
    }
    await AsyncStorage.removeItem(key);
    return null;
  });
}

export async function saveActiveMatch(userId: string, snapshot: ActiveMatchSnapshot): Promise<void> {
  return enqueueStorageOperation(() => AsyncStorage.setItem(storageKey(userId), JSON.stringify(snapshot)));
}

export async function clearActiveMatch(userId: string): Promise<void> {
  return enqueueStorageOperation(() => AsyncStorage.removeItem(storageKey(userId)));
}
