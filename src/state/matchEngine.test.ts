import { createMatch, currentServer, scorePoint, undoPoint } from './matchEngine';

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

// Custom serve interval: switch every 5 points (every 1 at deuce).
{
  let m = createMatch('singles', 10, 5);
  for (let i = 0; i < 4; i++) m = scorePoint(m, 'a');
  assert(currentServer(m).team === 'a', 'custom interval: a still serves after 4 points');
  m = scorePoint(m, 'a'); // 5th point
  assert(currentServer(m).team === 'b', 'custom interval: serve switches to b after 5 points');
}

console.log('matchEngine: all checks passed');
