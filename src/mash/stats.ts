import type { MatchState, Player } from "./match.ts";

export const WINDOW_MS = 1000;
/** Press lead that pulls the marker all the way to one side. */
export const TUG_RANGE = 20;
export const AUTOFIRE_CPS = 25;
/** Below this coefficient of variation of the press intervals, mashing looks machine-made. */
export const AUTOFIRE_CV = 0.05;
export const AUTOFIRE_MIN_INTERVALS = 15;

/** Presses in the rolling window (now - 1 s, now]. */
export function rollingCps(times: readonly number[], now: number, windowMs = WINDOW_MS): number {
  let count = 0;
  for (let i = times.length - 1; i >= 0; i--) {
    const t = times[i] ?? 0;
    if (t > now) continue;
    if (t <= now - windowMs) break;
    count++;
  }
  return (count * 1000) / windowMs;
}

/** Highest rolling 1 s count in a sorted list of press times. */
export function peakCps(times: readonly number[], windowMs = WINDOW_MS): number {
  let best = 0;
  let start = 0;
  for (let end = 0; end < times.length; end++) {
    while ((times[end] ?? 0) - (times[start] ?? 0) >= windowMs) start++;
    best = Math.max(best, end - start + 1);
  }
  return (best * 1000) / windowMs;
}

export function averageCps(count: number, seconds: number): number {
  if (seconds <= 0) return 0;
  return count / seconds;
}

/**
 * Marker position from -1 (fully at player 1, left) to +1 (fully at player 2, right).
 * Proportional to the press difference, clamped at TUG_RANGE.
 */
export function tugPosition(p1: number, p2: number, range = TUG_RANGE): number {
  if (range <= 0) return 0;
  const value = (p2 - p1) / range;
  return Math.max(-1, Math.min(1, value)) + 0;
}

export type Winner = Player | "tie";

export function winner(p1: number, p2: number): Winner {
  if (p1 === p2) return "tie";
  return p1 > p2 ? 0 : 1;
}

export function intervals(times: readonly number[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < times.length; i++) out.push((times[i] ?? 0) - (times[i - 1] ?? 0));
  return out;
}

/** Coefficient of variation (stddev / mean) of the press intervals, or null with too few. */
export function regularity(times: readonly number[]): number | null {
  const gaps = intervals(times);
  if (gaps.length < AUTOFIRE_MIN_INTERVALS) return null;
  const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  if (mean <= 0) return 0;
  const variance = gaps.reduce((a, b) => a + (b - mean) ** 2, 0) / gaps.length;
  return Math.sqrt(variance) / mean;
}

export type AutofireReason = "rate" | "regular" | null;

/** "Autofire-Verdacht": a peak above 25 presses per second, or intervals that are too even. */
export function autofireSuspect(times: readonly number[], dropped = 0): AutofireReason {
  if (peakCps(times) > AUTOFIRE_CPS) return "rate";
  if (dropped >= 5) return "rate";
  const cv = regularity(times);
  if (cv !== null && cv < AUTOFIRE_CV) return "regular";
  return null;
}

export type PlayerResult = {
  count: number;
  average: number;
  peak: number;
  falseStart: boolean;
  dropped: number;
  autofire: AutofireReason;
};

export type MatchResult = { duration: number; players: [PlayerResult, PlayerResult]; winner: Winner };

export function summarize(state: MatchState): MatchResult {
  const one = (player: Player): PlayerResult => {
    const times = state.presses[player];
    return {
      count: times.length,
      average: averageCps(times.length, state.duration),
      peak: peakCps(times),
      falseStart: state.falseStart[player],
      dropped: state.dropped[player],
      autofire: autofireSuspect(times, state.dropped[player]),
    };
  };
  const players: [PlayerResult, PlayerResult] = [one(0), one(1)];
  return { duration: state.duration, players, winner: winner(players[0].count, players[1].count) };
}
