import { calculateStandings, generateRoundRobinFixtures } from './tournamentEngine';

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
  const standings = calculateStandings(['a', 'b', 'c'], [
    { team_a_entry_id: 'a', team_b_entry_id: 'b', team_a_score: 10, team_b_score: 7, winner_entry_id: 'a' },
    { team_a_entry_id: 'c', team_b_entry_id: 'a', team_a_score: 8, team_b_score: 10, winner_entry_id: 'a' },
    { team_a_entry_id: 'b', team_b_entry_id: 'c', team_a_score: null, team_b_score: null, winner_entry_id: null },
  ]);
  assert(standings[0].entryId === 'a' && standings[0].wins === 2, 'wins rank first');
  assert(standings[2].entryId === 'b' && standings[2].played === 1, 'unfinished fixtures are excluded');
}

{
  const standings = calculateStandings(['a', 'b'], []);
  assert(standings[0].rank === 1 && standings[1].rank === 1, 'fully tied entries share a rank');
}

console.log('tournamentEngine: all checks passed');
