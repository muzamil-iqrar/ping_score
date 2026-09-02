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

export type Standing = {
  entryId: string;
  rank: number;
  played: number;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  pointDifference: number;
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

export function calculateStandings(entryIds: string[], results: TournamentResult[]): Standing[] {
  const standings = new Map<string, Standing>(
    entryIds.map((entryId) => [
      entryId,
      { entryId, rank: 0, played: 0, wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0, pointDifference: 0 },
    ])
  );

  results.forEach((result) => {
    if (
      !result.winner_entry_id ||
      result.team_a_score === null ||
      result.team_b_score === null
    ) {
      return;
    }

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
      teamB.losses += 1;
    } else if (result.winner_entry_id === teamB.entryId) {
      teamB.wins += 1;
      teamA.losses += 1;
    }
  });

  const ordered = Array.from(standings.values())
    .map((standing) => ({ ...standing, pointDifference: standing.pointsFor - standing.pointsAgainst }))
    .sort(compareStandings);

  let previous: Standing | null = null;
  return ordered.map((standing, index) => {
    const ranked = {
      ...standing,
      rank: previous && compareStandings(standing, previous) === 0 ? previous.rank : index + 1,
    };
    previous = ranked;
    return ranked;
  });
}

function compareStandings(a: Standing, b: Standing): number {
  return b.wins - a.wins || b.pointDifference - a.pointDifference || b.pointsFor - a.pointsFor;
}
