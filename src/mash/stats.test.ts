import assert from "node:assert/strict";
import test from "node:test";
import { registerPress, startMatch } from "./match.ts";
import { autofireSuspect, averageCps, peakCps, regularity, rollingCps, summarize, TUG_RANGE, tugPosition, winner } from "./stats.ts";

test("rolling CPS counts presses in the last second only", () => {
  const times = [100, 300, 600, 900, 1050, 1400];
  assert.equal(rollingCps(times, 1000), 4);
  assert.equal(rollingCps(times, 1100), 4, "100 left the window (100 <= 1100 - 1000)");
  assert.equal(rollingCps(times, 1400), 4);
  assert.equal(rollingCps(times, 2399), 1);
  assert.equal(rollingCps(times, 2400), 0);
  assert.equal(rollingCps([], 500), 0);
  assert.equal(rollingCps(times, 50), 0, "future presses are ignored");
});

test("peak and average CPS", () => {
  const times = Array.from({ length: 30 }, (_, i) => i * 100);
  assert.equal(peakCps(times), 10);
  assert.equal(averageCps(30, 10), 3);
  assert.equal(averageCps(10, 0), 0);
  assert.equal(peakCps([]), 0);
});

test("tug position follows the press difference and clamps", () => {
  assert.equal(tugPosition(0, 0), 0);
  assert.equal(tugPosition(10, 10), 0);
  assert.equal(tugPosition(15, 5), -10 / TUG_RANGE, "player 1 leads: marker moves left");
  assert.equal(tugPosition(5, 15), 10 / TUG_RANGE, "player 2 leads: marker moves right");
  assert.equal(tugPosition(1, 0), -1 / TUG_RANGE);
  assert.equal(tugPosition(100, 0), -1);
  assert.equal(tugPosition(0, 100), 1);
  assert.equal(Object.is(tugPosition(3, 3), -0), false);
});

test("winner and tie", () => {
  assert.equal(winner(10, 9), 0);
  assert.equal(winner(9, 10), 1);
  assert.equal(winner(7, 7), "tie");
  assert.equal(winner(0, 0), "tie");
});

test("autofire: too fast or too regular is flagged, human jitter is not", () => {
  const machine = Array.from({ length: 40 }, (_, i) => i * 80);
  assert.equal(regularity(machine), 0);
  assert.equal(autofireSuspect(machine), "regular");

  const tooFast = Array.from({ length: 60 }, (_, i) => i * 30 + (i % 3) * 5);
  assert.equal(autofireSuspect(tooFast), "rate");

  let seed = 7;
  const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  const human: number[] = [];
  let t = 0;
  for (let i = 0; i < 80; i++) {
    t += 90 + rand() * 60;
    human.push(Math.round(t));
  }
  assert.ok((regularity(human) ?? 0) > 0.05);
  assert.equal(autofireSuspect(human), null);
  assert.equal(autofireSuspect(machine.slice(0, 10)), null, "too few presses to judge");
  assert.equal(autofireSuspect([0, 200, 450], 5), "rate", "many dropped sub-25 ms presses");
});

test("summarize builds the result and winner from a match", () => {
  let m = startMatch(0, 5);
  m = registerPress(m, 1, 500).state;
  for (let i = 0; i < 20; i++) m = registerPress(m, 0, m.goAt + i * 120 + (i % 4) * 17).state;
  for (let i = 0; i < 12; i++) m = registerPress(m, 1, m.goAt + i * 200 + (i % 3) * 23).state;
  const r = summarize(m);
  assert.equal(r.duration, 5);
  assert.equal(r.winner, 0);
  assert.equal(r.players[0].count, 20);
  assert.equal(r.players[1].count, 12);
  assert.equal(r.players[0].average, 4);
  assert.equal(r.players[1].falseStart, true);
  assert.equal(r.players[0].falseStart, false);
});
