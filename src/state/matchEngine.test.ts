import { createMatch, currentServer, scorePoint, swapMatchSides, undoPoint } from './matchEngine';

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error('FAILED: ' + msg);
}

// Singles: serve switches every 2 points.
{
  let m = createMatch('singles', 10);
  assert(currentServer(m).team === 'a', 'singles: a serves first');
  m = scorePoint(m, 'a');
  assert(currentServer(m).team === 'a', 'singles: a still serves after 1 point');
  m = scorePoint(m, 'a');
  assert(currentServer(m).team === 'b', 'singles: serve switches to b after 2 points');
}

// Singles: deuce switches every point.
{
  let m = createMatch('singles', 10);
  for (let i = 0; i < 9; i++) m = scorePoint(m, 'a');
  for (let i = 0; i < 9; i++) m = scorePoint(m, 'b');
  // 9-9, pointsPlayed=18, turn=9 -> server = b (odd turn)
  assert(m.scoreA === 9 && m.scoreB === 9, 'singles: reached 9-9');
  const serverAt9_9 = currentServer(m).team;
  m = scorePoint(m, 'a'); // 10-9
  assert(currentServer(m).team !== serverAt9_9, 'singles: deuce serve switches every point');
}

// Singles: win by 2 enforced.
{
  let m = createMatch('singles', 10);
  for (let i = 0; i < 9; i++) {
    m = scorePoint(m, 'a');
    m = scorePoint(m, 'b');
  }
  m = scorePoint(m, 'a'); // 10-9
  assert(m.winner === null, 'singles: 10-9 is not a win (needs win by 2)');
  m = scorePoint(m, 'a'); // 11-9
  assert(m.winner === 'a', 'singles: 11-9 is a win');
}

// Doubles: full 4-player rotation cycles correctly across 8 points (2 full cycles).
{
  let m = createMatch('doubles', 20);
  const servers: string[] = [];
  for (let i = 0; i < 8; i++) {
    const s = currentServer(m);
    servers.push(`${s.team}${s.slot}`);
    m = scorePoint(m, i % 2 === 0 ? 'a' : 'b');
  }
  // Expect pattern: a0,a0,b0,b0,a1,a1,b1,b1 (each server holds for 2 points)
  const expected = ['a0', 'a0', 'b0', 'b0', 'a1', 'a1', 'b1', 'b1'];
  assert(JSON.stringify(servers) === JSON.stringify(expected), `doubles rotation: got ${servers}, expected ${expected}`);
}

// Doubles can start from a different player without changing the legal rotation.
{
  const m = createMatch('doubles', 20, 2, 2);
  const server = currentServer(m);
  assert(server.team === 'a' && server.slot === 1, 'doubles: rotation index 2 starts with team A player two');
}

// Undo restores server correctly.
{
  let m = createMatch('singles', 10);
  m = scorePoint(m, 'a');
  m = scorePoint(m, 'a'); // serve now b
  assert(currentServer(m).team === 'b', 'pre-undo: b serves');
  m = undoPoint(m);
  assert(currentServer(m).team === 'a', 'undo: serve reverts to a');
  assert(m.scoreA === 1, 'undo: score reverts to 1');
}

// Undo can step back through multiple points in the exact order they were scored.
{
  let m = createMatch('singles', 10);
  for (const team of ['a', 'b', 'b', 'a'] as const) m = scorePoint(m, team);
  m = undoPoint(m); // Remove A: 1-2
  m = undoPoint(m); // Remove B: 1-1
  m = undoPoint(m); // Remove B: 1-0
  assert(m.scoreA === 1 && m.scoreB === 0, 'multi-undo: three points are removed in reverse order');
  assert(m.pointsPlayed === 1 && m.pointHistory.length === 1, 'multi-undo: history and point count stay in sync');
  assert(m.lastScoringTeam === 'a', 'multi-undo: previous scoring team becomes available for another undo');
  assert(currentServer(m).team === 'a', 'multi-undo: server is restored correctly');
  m = undoPoint(m);
  const empty = undoPoint(m);
  assert(empty === m, 'multi-undo: undo at 0-0 is a no-op');
}

// Custom serve interval: switch every 5 points (every 1 at deuce).
{
  let m = createMatch('singles', 10, 5);
  for (let i = 0; i < 4; i++) m = scorePoint(m, 'a');
  assert(currentServer(m).team === 'a', 'custom interval: a still serves after 4 points');
  m = scorePoint(m, 'a'); // 5th point
  assert(currentServer(m).team === 'b', 'custom interval: serve switches to b after 5 points');
}

// Regression: doubles + serve interval that doesn't divide evenly into deuce entry used to
// underflow the rotation index and crash (e.g. target=20, interval=5, reaching 19-19).
{
  for (const mode of ['singles', 'doubles'] as const) {
    for (const pointTarget of [10, 20]) {
      for (const serveInterval of [1, 2, 5]) {
        let m = createMatch(mode, pointTarget, serveInterval);
        for (let i = 0; i < pointTarget - 1; i++) m = scorePoint(m, 'a');
        for (let i = 0; i < pointTarget - 1; i++) m = scorePoint(m, 'b');
        for (let i = 0; i < 20; i++) {
          const server = currentServer(m);
          assert(['a', 'b'].includes(server.team) && !Number.isNaN(server.slot), `deuce rotation crash: mode=${mode} target=${pointTarget} interval=${serveInterval}`);
          m = scorePoint(m, i % 2 === 0 ? 'a' : 'b');
        }
      }
    }
  }
}

// Swapping sides mirrors the match: the same physical player keeps serving, and the score
// travels with its team rather than staying on its half of the screen.
{
  for (const mode of ['singles', 'doubles'] as const) {
    for (const rotation of [0, 1, 2, 3] as const) {
      let m = createMatch(mode, 10, 2, rotation);
      m = scorePoint(m, 'a');
      m = scorePoint(m, 'a');
      m = scorePoint(m, 'b');

      const before = currentServer(m);
      const swapped = swapMatchSides(m);
      const after = currentServer(swapped);

      assert(swapped.scoreA === m.scoreB && swapped.scoreB === m.scoreA, `swap mirrors the score: mode=${mode}`);
      assert(after.team !== before.team, `swap moves the serve to the other side: mode=${mode} rotation=${rotation}`);
      if (mode === 'doubles') {
        assert(after.slot === before.slot, `swap keeps the same serving slot: rotation=${rotation}`);
      }
      assert(swapMatchSides(swapped).scoreA === m.scoreA && swapMatchSides(swapped).scoreB === m.scoreB, 'swapping twice restores the original sides');

      // The scoreboard must keep agreeing with the point history after a swap.
      assert(swapped.pointHistory.filter((t) => t === 'a').length === swapped.scoreA, 'swap keeps history consistent with score A');
      assert(swapped.pointHistory.filter((t) => t === 'b').length === swapped.scoreB, 'swap keeps history consistent with score B');
    }
  }

  // A finished match keeps its winner pointing at the same team after a swap.
  let decided = createMatch('singles', 10, 2);
  for (let i = 0; i < 10; i++) decided = scorePoint(decided, 'a');
  assert(decided.winner === 'a' && swapMatchSides(decided).winner === 'b', 'swap moves the winner to the other side');
}

console.log('matchEngine: all checks passed');
