import assert from "node:assert/strict";
import test from "node:test";
import { COUNTDOWN_MS, countdownNumber, DURATIONS, MIN_GAP_MS, phaseAt, registerPress, remainingMs, startMatch } from "./match.ts";

test("round lengths are 5, 10, 15, 20, 30 s", () => {
  assert.deepEqual([...DURATIONS], [5, 10, 15, 20, 30]);
});

test("countdown 3-2-1 then Los, then the round, then done", () => {
  const m = startMatch(1000, 5);
  assert.equal(m.goAt, 1000 + COUNTDOWN_MS);
  assert.equal(m.endAt, m.goAt + 5000);
  assert.equal(phaseAt(m, 1000), "countdown");
  assert.equal(countdownNumber(m, 1000), 3);
  assert.equal(countdownNumber(m, 2001), 2);
  assert.equal(countdownNumber(m, 3001), 1);
  assert.equal(countdownNumber(m, 3999), 1);
  assert.equal(countdownNumber(m, 4000), 0);
  assert.equal(phaseAt(m, 4000), "running");
  assert.equal(remainingMs(m, 4000), 5000);
  assert.equal(remainingMs(m, 6500), 2500);
  assert.equal(phaseAt(m, 8999), "running");
  assert.equal(phaseAt(m, 9000), "done");
  assert.equal(remainingMs(m, 12000), 0);
});

test("presses before Los do not count and mark a false start", () => {
  let m = startMatch(0, 10);
  const early = registerPress(m, 0, 1500);
  assert.equal(early.result, "early");
  m = early.state;
  assert.deepEqual(m.falseStart, [true, false]);
  assert.equal(m.presses[0].length, 0);
  m = registerPress(m, 0, 2999).state;
  assert.equal(m.presses[0].length, 0);
  const go = registerPress(m, 0, 3000);
  assert.equal(go.result, "counted");
  assert.equal(go.state.presses[0].length, 1);
  assert.deepEqual(go.state.falseStart, [true, false], "the flag stays for the result");
});

test("presses after the end do not count", () => {
  const m = startMatch(0, 5);
  const late = registerPress(m, 1, m.endAt);
  assert.equal(late.result, "late");
  assert.equal(late.state, m);
});

test("presses closer than 25 ms per player are dropped, the other player is independent", () => {
  let m = startMatch(0, 10);
  const t = m.goAt;
  m = registerPress(m, 0, t).state;
  const fast = registerPress(m, 0, t + MIN_GAP_MS - 1);
  assert.equal(fast.result, "debounced");
  m = fast.state;
  assert.deepEqual(m.dropped, [1, 0]);
  const other = registerPress(m, 1, t + 1);
  assert.equal(other.result, "counted", "player 2 is not blocked by player 1");
  m = other.state;
  const ok = registerPress(m, 0, t + MIN_GAP_MS);
  assert.equal(ok.result, "counted");
  assert.deepEqual([ok.state.presses[0].length, ok.state.presses[1].length], [2, 1]);
});

test("registerPress does not mutate the old state", () => {
  const m = startMatch(0, 5);
  registerPress(m, 0, m.goAt);
  registerPress(m, 1, 100);
  assert.equal(m.presses[0].length, 0);
  assert.deepEqual(m.falseStart, [false, false]);
});
