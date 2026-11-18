// Pure match state machine. Times are milliseconds from one clock (performance.now()).
// Phases: idle -> countdown (3, 2, 1) -> running (after "Los") -> done.

export type Player = 0 | 1;
export const PLAYERS: readonly Player[] = [0, 1];

export const DURATIONS = [5, 10, 15, 20, 30] as const;
export type Duration = (typeof DURATIONS)[number];
export const DEFAULT_DURATION: Duration = 10;

export const COUNTDOWN_MS = 3000;
/** Presses closer than this (per player) are dropped as implausible. */
export const MIN_GAP_MS = 25;

export type MatchState = {
  duration: Duration;
  startedAt: number;
  goAt: number;
  endAt: number;
  /** Accepted press times per player (only between goAt and endAt). */
  presses: [number[], number[]];
  /** Pressed during the countdown. */
  falseStart: [boolean, boolean];
  /** Presses dropped because they came faster than MIN_GAP_MS. */
  dropped: [number, number];
  lastAccepted: [number, number];
};

export type Phase = "countdown" | "running" | "done";

export function isDuration(value: unknown): value is Duration {
  return typeof value === "number" && (DURATIONS as readonly number[]).includes(value);
}

export function startMatch(now: number, duration: Duration): MatchState {
  const goAt = now + COUNTDOWN_MS;
  return {
    duration,
    startedAt: now,
    goAt,
    endAt: goAt + duration * 1000,
    presses: [[], []],
    falseStart: [false, false],
    dropped: [0, 0],
    lastAccepted: [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY],
  };
}

export function phaseAt(state: MatchState, now: number): Phase {
  if (now < state.goAt) return "countdown";
  if (now < state.endAt) return "running";
  return "done";
}

/** 3, 2, 1 during the countdown, 0 once it is "Los". */
export function countdownNumber(state: MatchState, now: number): number {
  if (now >= state.goAt) return 0;
  return Math.min(3, Math.ceil((state.goAt - now) / 1000));
}

export function remainingMs(state: MatchState, now: number): number {
  return Math.max(0, Math.min(state.duration * 1000, state.endAt - now));
}

export type PressResult = "counted" | "early" | "debounced" | "late";

/** Registers one rising edge. Returns the new state (same object when nothing changed) and why. */
export function registerPress(state: MatchState, player: Player, now: number): { state: MatchState; result: PressResult } {
  const phase = phaseAt(state, now);
  if (phase === "countdown") {
    if (state.falseStart[player]) return { state, result: "early" };
    const falseStart: [boolean, boolean] = [...state.falseStart];
    falseStart[player] = true;
    return { state: { ...state, falseStart }, result: "early" };
  }
  if (phase === "done") return { state, result: "late" };
  if (now - state.lastAccepted[player] < MIN_GAP_MS) {
    const dropped: [number, number] = [...state.dropped];
    dropped[player] += 1;
    return { state: { ...state, dropped }, result: "debounced" };
  }
  const presses: [number[], number[]] = [state.presses[0], state.presses[1]];
  presses[player] = [...presses[player], now];
  const lastAccepted: [number, number] = [...state.lastAccepted];
  lastAccepted[player] = now;
  return { state: { ...state, presses, lastAccepted }, result: "counted" };
}
