export type RoundRobinFixture = {
  roundNumber: number;
  teamAId: string;
  teamBId: string;
};

export type TournamentResult = {
  team_a_entry_id: string;
  team_b_entry_id: string;
  team_a_score: number | null;
  team_b_score: number | null;
  winner_entry_id: string | null;
};

type SchedulableFixture = TournamentResult & {
  round_number: number;
  played_at: string | null;
};

export type Standing = {
  entryId: string;
  rank: number;
  played: number;
  wins: number;
  losses: number;
  matchPoints: number;
  pointsFor: number;
  pointsAgainst: number;
  pointDifference: number;
  pointRatio: number;
};

/** Creates the requested number of matches between every pair of entries, grouped into balanced rounds. */
export function generateRoundRobinFixtures(entryIds: string[], matchesPerOpponent: number = 1): RoundRobinFixture[] {
  if (entryIds.length < 2) return [];

  const teams: Array<string | null> = [...entryIds];
  if (teams.length % 2 !== 0) teams.push(null);

  const singleRoundRobin: RoundRobinFixture[] = [];
  const rounds = teams.length - 1;
  const matchesPerRound = teams.length / 2;

  for (let round = 0; round < rounds; round += 1) {
    for (let match = 0; match < matchesPerRound; match += 1) {
      const first = teams[match];
      const second = teams[teams.length - 1 - match];
      if (first && second) {
        const swapSides = round % 2 === 1;
        singleRoundRobin.push({
          roundNumber: round + 1,
          teamAId: swapSides ? second : first,
          teamBId: swapSides ? first : second,
        });
      }
    }

    teams.splice(1, 0, teams.pop()!);
  }

  return Array.from({ length: matchesPerOpponent }, (_, leg) =>
    singleRoundRobin.map((fixture) => ({
      roundNumber: fixture.roundNumber + leg * rounds,
      teamAId: leg % 2 === 0 ? fixture.teamAId : fixture.teamBId,
      teamBId: leg % 2 === 0 ? fixture.teamBId : fixture.teamAId,
    }))
  ).flat();
}

/** Picks the fairest next fixture from the earliest unfinished round. */
export function selectNextTournamentFixture<T extends SchedulableFixture>(fixtures: T[]): T | undefined {
  const pending = fixtures.filter((fixture) => !fixture.winner_entry_id);
  if (pending.length === 0) return undefined;

  const earliestRound = Math.min(...pending.map((fixture) => fixture.round_number));
  const roundFixtures = pending.filter((fixture) => fixture.round_number === earliestRound);
  const completed = fixtures
    .filter((fixture) => Boolean(fixture.winner_entry_id && fixture.played_at))
    .sort((a, b) => new Date(a.played_at!).getTime() - new Date(b.played_at!).getTime());

  const appearances = new Map<string, number>();
  const lastPlayedAt = new Map<string, number>();
  completed.forEach((fixture, index) => {
    for (const entryId of [fixture.team_a_entry_id, fixture.team_b_entry_id]) {
      appearances.set(entryId, (appearances.get(entryId) ?? 0) + 1);
      lastPlayedAt.set(entryId, index);
    }
  });

  const previous = completed[completed.length - 1];
  const previousEntries = new Set(previous ? [previous.team_a_entry_id, previous.team_b_entry_id] : []);
  const restFor = (entryId: string) => completed.length - (lastPlayedAt.get(entryId) ?? -1);

  return roundFixtures
    .map((fixture, originalIndex) => {
      const entries = [fixture.team_a_entry_id, fixture.team_b_entry_id];
      const gamesPlayed = entries.map((entryId) => appearances.get(entryId) ?? 0);
      const rest = entries.map(restFor);
      return {
        fixture,
        originalIndex,
        immediateRepeats: entries.filter((entryId) => previousEntries.has(entryId)).length,
        mostGamesPlayed: Math.max(...gamesPlayed),
        totalGamesPlayed: gamesPlayed[0] + gamesPlayed[1],
        shortestRest: Math.min(...rest),
        totalRest: rest[0] + rest[1],
      };
    })
    .sort((a, b) =>
      a.immediateRepeats - b.immediateRepeats
      || a.mostGamesPlayed - b.mostGamesPlayed
      || a.totalGamesPlayed - b.totalGamesPlayed
      || b.shortestRest - a.shortestRest
      || b.totalRest - a.totalRest
      || a.originalIndex - b.originalIndex
    )[0]?.fixture;
}

/** Alternates the first serving team and that team's starting player across doubles matches. */
export function doublesStartingServerRotationIndex(
  fixture: Pick<SchedulableFixture, 'team_a_entry_id' | 'team_b_entry_id'>,
  fixtures: SchedulableFixture[]
): 0 | 1 | 2 | 3 {
  const completed = fixtures.filter((match) => Boolean(match.winner_entry_id && match.played_at));
  const startingTeam = completed.length % 2 === 0 ? 'a' : 'b';
  const startingEntryId = startingTeam === 'a' ? fixture.team_a_entry_id : fixture.team_b_entry_id;
  const priorMatches = completed.filter(
    (match) => match.team_a_entry_id === startingEntryId || match.team_b_entry_id === startingEntryId
  ).length;
  const startingSlot = priorMatches % 2;

  if (startingTeam === 'a') return startingSlot === 0 ? 0 : 2;
  return startingSlot === 0 ? 1 : 3;
}

export function calculateStandings(entryIds: string[], results: TournamentResult[]): Standing[] {
  const standings = new Map<string, Standing>(
    entryIds.map((entryId) => [
      entryId,
      { entryId, rank: 0, played: 0, wins: 0, losses: 0, matchPoints: 0, pointsFor: 0, pointsAgainst: 0, pointDifference: 0, pointRatio: 0 },
    ])
  );

  const completedResults = results.filter(isCompletedResult);
  completedResults.forEach((result) => {
    const teamA = standings.get(result.team_a_entry_id);
    const teamB = standings.get(result.team_b_entry_id);
    if (!teamA || !teamB) return;

    teamA.played += 1;
    teamB.played += 1;
    teamA.pointsFor += result.team_a_score;
    teamA.pointsAgainst += result.team_b_score;
    teamB.pointsFor += result.team_b_score;
    teamB.pointsAgainst += result.team_a_score;

    if (result.winner_entry_id === teamA.entryId) {
      teamA.wins += 1;
      teamA.matchPoints += 2;
      teamB.losses += 1;
      teamB.matchPoints += 1;
    } else if (result.winner_entry_id === teamB.entryId) {
      teamB.wins += 1;
      teamB.matchPoints += 2;
      teamA.losses += 1;
      teamA.matchPoints += 1;
    }
  });

  const finalized = Array.from(standings.values()).map((standing) => ({
    ...standing,
    pointDifference: standing.pointsFor - standing.pointsAgainst,
    pointRatio: scoreRatio(standing.pointsFor, standing.pointsAgainst),
  }));
  const standingById = new Map(finalized.map((standing) => [standing.entryId, standing]));
  const matchPointGroups = new Map<number, string[]>();
  finalized.forEach((standing) => {
    matchPointGroups.set(standing.matchPoints, [...(matchPointGroups.get(standing.matchPoints) ?? []), standing.entryId]);
  });

  const orderedTieBlocks = Array.from(matchPointGroups.keys())
    .sort((a, b) => b - a)
    .flatMap((matchPoints) => resolveTiedEntries(matchPointGroups.get(matchPoints)!, completedResults));

  const ordered: Standing[] = [];
  let rank = 1;
  orderedTieBlocks.forEach((entryBlock) => {
    entryBlock.forEach((entryId) => ordered.push({ ...standingById.get(entryId)!, rank }));
    rank += entryBlock.length;
  });
  return ordered;
}

type CompletedTournamentResult = TournamentResult & {
  team_a_score: number;
  team_b_score: number;
  winner_entry_id: string;
};

type TieStats = {
  matchPoints: number;
  gameWins: number;
  gameLosses: number;
  pointsFor: number;
  pointsAgainst: number;
};

function isCompletedResult(result: TournamentResult): result is CompletedTournamentResult {
  return Boolean(result.winner_entry_id) && result.team_a_score !== null && result.team_b_score !== null;
}

function scoreRatio(forValue: number, againstValue: number): number {
  if (againstValue === 0) return forValue === 0 ? 0 : Number.POSITIVE_INFINITY;
  return forValue / againstValue;
}

function resolveTiedEntries(entryIds: string[], results: CompletedTournamentResult[]): string[][] {
  if (entryIds.length < 2) return [entryIds];

  const tiedEntryIds = new Set(entryIds);
  const stats = new Map<string, TieStats>(entryIds.map((entryId) => [entryId, {
    matchPoints: 0,
    gameWins: 0,
    gameLosses: 0,
    pointsFor: 0,
    pointsAgainst: 0,
  }]));

  results.forEach((result) => {
    if (!tiedEntryIds.has(result.team_a_entry_id) || !tiedEntryIds.has(result.team_b_entry_id)) return;
    const teamA = stats.get(result.team_a_entry_id)!;
    const teamB = stats.get(result.team_b_entry_id)!;
    teamA.pointsFor += result.team_a_score;
    teamA.pointsAgainst += result.team_b_score;
    teamB.pointsFor += result.team_b_score;
    teamB.pointsAgainst += result.team_a_score;

    if (result.winner_entry_id === result.team_a_entry_id) {
      teamA.matchPoints += 2;
      teamA.gameWins += 1;
      teamB.matchPoints += 1;
      teamB.gameLosses += 1;
    } else if (result.winner_entry_id === result.team_b_entry_id) {
      teamB.matchPoints += 2;
      teamB.gameWins += 1;
      teamA.matchPoints += 1;
      teamA.gameLosses += 1;
    }
  });

  const metrics = [
    (entryId: string) => stats.get(entryId)!.matchPoints,
    (entryId: string) => scoreRatio(stats.get(entryId)!.gameWins, stats.get(entryId)!.gameLosses),
    (entryId: string) => scoreRatio(stats.get(entryId)!.pointsFor, stats.get(entryId)!.pointsAgainst),
  ];

  for (const metric of metrics) {
    const groups = new Map<number, string[]>();
    entryIds.forEach((entryId) => {
      const value = metric(entryId);
      groups.set(value, [...(groups.get(value) ?? []), entryId]);
    });
    if (groups.size === 1) continue;
    return Array.from(groups.keys())
      .sort((a, b) => b - a)
      .flatMap((value) => {
        const group = groups.get(value)!;
        return group.length === 1 ? [group] : resolveTiedEntries(group, results);
      });
  }

  return [entryIds];
}
