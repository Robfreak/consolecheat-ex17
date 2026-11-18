import { DURATIONS, isDuration, type Duration } from "./match.ts";
import type { MatchResult } from "./stats.ts";

// What this page stores.
//
// localStorage key `consolecheat-mash-v1`:
//
//   {
//     "schema": "consolecheat-mash",
//     "version": 1,
//     "best": { "10": { "cps": 9.4, "name": "Anna", "at": 1731960000000 } },
//     "wins": [{ "name": "Anna", "wins": 3 }],
//     "matches": [{ "at": …, "duration": 10, "names": ["Anna", "Ben"], "counts": [94, 88], "winner": 0 | 1 | "tie" }]
//   }

export const RECORDS_KEY = "consolecheat-mash-v1";
export const LANG_KEY = "consolecheat-lang";
export const THEME_KEY = "consolecheat-theme";
export const RECORDS_SCHEMA = "consolecheat-mash";
export const RECORDS_VERSION = 1;
export const MAX_MATCHES = 10;
export const MAX_WIN_NAMES = 50;
export const MAX_NAME = 24;

export type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export type Best = { cps: number; name: string; at: number };
export type WinEntry = { name: string; wins: number };
export type MatchEntry = {
  at: number;
  duration: Duration;
  names: [string, string];
  counts: [number, number];
  winner: 0 | 1 | "tie";
};
export type Records = {
  best: Partial<Record<Duration, Best>>;
  wins: WinEntry[];
  matches: MatchEntry[];
};
export type LoadResult = { records: Records; corrupt: boolean };

export function emptyRecords(): Records {
  return { best: {}, wins: [], matches: [] };
}

export function cleanName(raw: string, fallback: string): string {
  const name = raw.replace(/\s+/g, " ").trim().slice(0, MAX_NAME);
  return name || fallback;
}

const isNum = (v: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): v is number =>
  typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
const isName = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0 && v.length <= MAX_NAME;

function parseMatch(data: unknown): MatchEntry | null {
  if (!data || typeof data !== "object") return null;
  const m = data as Record<string, unknown>;
  if (!isNum(m.at) || !isDuration(m.duration)) return null;
  if (!Array.isArray(m.names) || m.names.length !== 2 || !m.names.every(isName)) return null;
  if (!Array.isArray(m.counts) || m.counts.length !== 2 || !m.counts.every((c) => isNum(c, 0, 100000) && Number.isInteger(c))) {
    return null;
  }
  if (m.winner !== 0 && m.winner !== 1 && m.winner !== "tie") return null;
  return {
    at: m.at,
    duration: m.duration,
    names: [m.names[0], m.names[1]] as [string, string],
    counts: [m.counts[0], m.counts[1]] as [number, number],
    winner: m.winner,
  };
}

/** Never throws. Missing key: empty. Bad JSON, foreign schema, other version: empty and corrupt. */
export function parseRecords(raw: string | null): LoadResult {
  if (raw == null) return { records: emptyRecords(), corrupt: false };
  try {
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== "object" || Array.isArray(data)) return { records: emptyRecords(), corrupt: true };
    const rec = data as Record<string, unknown>;
    if (rec.schema !== RECORDS_SCHEMA || rec.version !== RECORDS_VERSION) return { records: emptyRecords(), corrupt: true };
    let corrupt = false;
    const records = emptyRecords();
    if (rec.best && typeof rec.best === "object" && !Array.isArray(rec.best)) {
      for (const [key, value] of Object.entries(rec.best as Record<string, unknown>)) {
        const duration = Number(key);
        const best = value as Record<string, unknown> | null;
        if (isDuration(duration) && best && isNum(best.cps, 0, 1000) && isName(best.name) && isNum(best.at)) {
          records.best[duration] = { cps: best.cps, name: best.name, at: best.at };
        } else corrupt = true;
      }
    } else if (rec.best !== undefined) corrupt = true;
    if (Array.isArray(rec.wins)) {
      for (const item of rec.wins.slice(0, MAX_WIN_NAMES)) {
        const entry = item as Record<string, unknown> | null;
        if (entry && isName(entry.name) && isNum(entry.wins, 0, 1e9) && Number.isInteger(entry.wins)) {
          records.wins.push({ name: entry.name, wins: entry.wins });
        } else corrupt = true;
      }
    } else if (rec.wins !== undefined) corrupt = true;
    if (Array.isArray(rec.matches)) {
      for (const item of rec.matches.slice(0, MAX_MATCHES)) {
        const match = parseMatch(item);
        if (match) records.matches.push(match);
        else corrupt = true;
      }
    } else if (rec.matches !== undefined) corrupt = true;
    return { records, corrupt };
  } catch {
    return { records: emptyRecords(), corrupt: true };
  }
}

export function serializeRecords(records: Records): string {
  return JSON.stringify({ schema: RECORDS_SCHEMA, version: RECORDS_VERSION, ...records });
}

export function loadRecords(local: StorageLike): LoadResult {
  try {
    return parseRecords(local.getItem(RECORDS_KEY));
  } catch {
    return { records: emptyRecords(), corrupt: false };
  }
}

export function saveRecords(local: StorageLike, records: Records): boolean {
  try {
    local.setItem(RECORDS_KEY, serializeRecords(records));
    return true;
  } catch {
    return false;
  }
}

/** Removes only `consolecheat-mash-v1`. Language, theme, and every other key stay. */
export function resetRecords(local: StorageLike): boolean {
  try {
    local.removeItem(RECORDS_KEY);
    return true;
  } catch {
    return false;
  }
}

const same = (a: string, b: string) => a.toLocaleLowerCase() === b.toLocaleLowerCase();

/**
 * Adds a finished match. Wins count per name (case-insensitive). A tie adds no win.
 * Best average CPS per round length ignores players flagged for autofire.
 */
export function recordMatch(records: Records, result: MatchResult, names: [string, string], at: number): Records {
  if (!isDuration(result.duration)) return records;
  const duration: Duration = result.duration;
  const best = { ...records.best };
  for (const player of [0, 1] as const) {
    const r = result.players[player];
    if (r.autofire || r.count === 0) continue;
    const current = best[duration];
    if (!current || r.average > current.cps) best[duration] = { cps: Math.round(r.average * 100) / 100, name: names[player], at };
  }
  let wins = records.wins.map((entry) => ({ ...entry }));
  if (result.winner !== "tie") {
    const name = names[result.winner];
    const existing = wins.find((entry) => same(entry.name, name));
    if (existing) existing.wins += 1;
    else wins.push({ name, wins: 1 });
    wins.sort((a, b) => b.wins - a.wins || a.name.localeCompare(b.name));
    wins = wins.slice(0, MAX_WIN_NAMES);
  }
  const match: MatchEntry = {
    at,
    duration,
    names: [...names],
    counts: [result.players[0].count, result.players[1].count],
    winner: result.winner,
  };
  return { best, wins, matches: [match, ...records.matches].slice(0, MAX_MATCHES) };
}

export const bestDurations = DURATIONS;
