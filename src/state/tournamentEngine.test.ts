import { calculateStandings, doublesStartingServerRotationIndex, generateRoundRobinFixtures, selectNextTournamentFixture } from './tournamentEngine';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error('FAILED: ' + message);
}

{
  const fixtures = generateRoundRobinFixtures(['a', 'b', 'c', 'd']);
  assert(fixtures.length === 6, 'four entries produce six fixtures');
  assert(new Set(fixtures.map((fixture) => [fixture.teamAId, fixture.teamBId].sort().join('-'))).size === 6, 'each pairing appears once');
  assert(new Set(fixtures.map((fixture) => fixture.roundNumber)).size === 3, 'four entries produce three rounds');
}

{
  const fixtures = generateRoundRobinFixtures(['a', 'b', 'c']);
  assert(fixtures.length === 3, 'three entries produce three fixtures');
  assert(new Set(fixtures.map((fixture) => fixture.roundNumber)).size === 3, 'a bye creates one match per round');
}

{
  const fixtures = generateRoundRobinFixtures(['a', 'b', 'c'], 2);
  assert(fixtures.length === 6, 'two matches per opponent doubles the fixture count');
  assert(new Set(fixtures.map((fixture) => fixture.roundNumber)).size === 6, 'each leg has its own set of rounds');
}

{
  const fixtures = generateRoundRobinFixtures(['a', 'b', 'c', 'd', 'e', 'f']).map((fixture, index) => ({
    id: String(index),
    round_number: fixture.roundNumber,
    team_a_entry_id: fixture.teamAId,
    team_b_entry_id: fixture.teamBId,
    team_a_score: fixture.roundNumber === 1 ? 10 : null,
    team_b_score: fixture.roundNumber === 1 ? 5 : null,
    winner_entry_id: fixture.roundNumber === 1 ? fixture.teamAId : null,
    played_at: fixture.roundNumber === 1 ? new Date(2026, 0, 1, 0, index).toISOString() : null,
  }));
  const lastPlayed = fixtures.filter((fixture) => fixture.winner_entry_id).at(-1)!;
  const next = selectNextTournamentFixture(fixtures)!;
  const lastEntries = new Set([lastPlayed.team_a_entry_id, lastPlayed.team_b_entry_id]);
  assert(next.round_number === 2, 'rest scheduling stays in the earliest unfinished round');
  assert(!lastEntries.has(next.team_a_entry_id) && !lastEntries.has(next.team_b_entry_id), 'rest scheduling avoids immediate repeats when possible');
}

{
  const completed = [
    { round_number: 1, team_a_entry_id: 'a', team_b_entry_id: 'b', team_a_score: 10, team_b_score: 7, winner_entry_id: 'a', played_at: '2026-01-01T00:00:00.000Z' },
  ];
  const firstFixture = { round_number: 1, team_a_entry_id: 'a', team_b_entry_id: 'b', team_a_score: null, team_b_score: null, winner_entry_id: null, played_at: null };
  const secondFixture = { round_number: 2, team_a_entry_id: 'b', team_b_entry_id: 'a', team_a_score: null, team_b_score: null, winner_entry_id: null, played_at: null };
  assert(doublesStartingServerRotationIndex(firstFixture, []) === 0, 'doubles start: first match starts with team A player one');
  assert(doublesStartingServerRotationIndex(secondFixture, completed) === 3, 'doubles start: the same team switches to player two in the return match');
}

{
  const standings = calculateStandings(['a', 'b', 'c'], [
    { team_a_entry_id: 'a', team_b_entry_id: 'b', team_a_score: 10, team_b_score: 7, winner_entry_id: 'a' },
    { team_a_entry_id: 'c', team_b_entry_id: 'a', team_a_score: 8, team_b_score: 10, winner_entry_id: 'a' },
    { team_a_entry_id: 'b', team_b_entry_id: 'c', team_a_score: null, team_b_score: null, winner_entry_id: null },
  ]);
  const teamB = standings.find((standing) => standing.entryId === 'b')!;
  assert(standings[0].entryId === 'a' && standings[0].matchPoints === 4, 'two wins earn four tournament points and rank first');
  assert(teamB.played === 1 && teamB.matchPoints === 0, 'a loss earns no tournament points and unfinished fixtures are excluded');
}

{
  const standings = calculateStandings(['a', 'b'], []);
  assert(standings[0].rank === 1 && standings[1].rank === 1, 'fully tied entries share a rank');
}

{
  // a: 11+2 for, 9+11 against => -7. b: 9+11 for, 11+5 against => +4. c: 5+11 for, 11+2 against => +3.
  const standings = calculateStandings(['a', 'b', 'c'], [
    { team_a_entry_id: 'a', team_b_entry_id: 'b', team_a_score: 11, team_b_score: 9, winner_entry_id: 'a' },
    { team_a_entry_id: 'b', team_b_entry_id: 'c', team_a_score: 11, team_b_score: 5, winner_entry_id: 'b' },
    { team_a_entry_id: 'c', team_b_entry_id: 'a', team_a_score: 11, team_b_score: 2, winner_entry_id: 'c' },
  ]);
  assert(standings.every((standing) => standing.matchPoints === 2), 'one win and one loss earn two tournament points');
  assert(standings.map((standing) => standing.pointDifference).join(',') === '4,3,-7', 'standings expose point difference');
  assert(standings.map((standing) => standing.entryId).join('') === 'bca', 'equal tournament points are resolved by point difference');
  assert(standings.map((standing) => standing.rank).join(',') === '1,2,3', 'point difference separates equal tournament points into distinct ranks');
}

{
  // Equal tournament points and equal difference: points scored decides.
  const standings = calculateStandings(['a', 'b', 'c', 'd'], [
    { team_a_entry_id: 'a', team_b_entry_id: 'b', team_a_score: 11, team_b_score: 6, winner_entry_id: 'a' },
    { team_a_entry_id: 'c', team_b_entry_id: 'd', team_a_score: 7, team_b_score: 2, winner_entry_id: 'c' },
  ]);
  const [first, second] = standings;
  assert(first.entryId === 'a' && second.entryId === 'c', 'equal points and difference are resolved by points scored');
  assert(first.rank === 1 && second.rank === 2, 'points scored produces distinct ranks');
}

{
  const standings = calculateStandings(['a', 'b', 'c'], [
    { team_a_entry_id: 'a', team_b_entry_id: 'b', team_a_score: 11, team_b_score: 5, winner_entry_id: 'a' },
    { team_a_entry_id: 'c', team_b_entry_id: 'b', team_a_score: 11, team_b_score: 5, winner_entry_id: 'c' },
  ]);
  assert(standings[0].rank === 1 && standings[1].rank === 1, 'entries equal on points, difference and points scored share a rank');
  assert(standings[2].rank === 3, 'a shared rank consumes the position below it');
}

console.log('tournamentEngine: all checks passed');
