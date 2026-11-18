import assert from "node:assert/strict";
import test from "node:test";
import { registerPress, startMatch } from "./match.ts";
import {
  cleanName,
  emptyRecords,
  LANG_KEY,
  loadRecords,
  MAX_MATCHES,
  parseRecords,
  recordMatch,
  RECORDS_KEY,
  resetRecords,
  saveRecords,
  serializeRecords,
  THEME_KEY,
  type StorageLike,
} from "./records.ts";
import { summarize, type MatchResult } from "./stats.ts";

function memory(initial: Record<string, string> = {}): StorageLike & { data: Map<string, string> } {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, String(value)),
    removeItem: (key) => void data.delete(key),
  };
}

function result(counts: [number, number], duration: 5 | 10 = 10, autofire: [boolean, boolean] = [false, false]): MatchResult {
  const one = (i: 0 | 1) => ({
    count: counts[i],
    average: counts[i] / duration,
    peak: 0,
    falseStart: false,
    dropped: 0,
    autofire: autofire[i] ? ("rate" as const) : null,
  });
  return { duration, players: [one(0), one(1)], winner: counts[0] === counts[1] ? "tie" : counts[0] > counts[1] ? 0 : 1 };
}

test("the key is consolecheat-mash-v1", () => {
  assert.equal(RECORDS_KEY, "consolecheat-mash-v1");
});

test("records persist best CPS per round length, wins per name, and the last matches", () => {
  const store = memory();
  assert.deepEqual(loadRecords(store), { records: emptyRecords(), corrupt: false });
  assert.equal(store.data.has(RECORDS_KEY), false);

  let r = recordMatch(emptyRecords(), result([80, 60]), ["Anna", "Ben"], 1);
  r = recordMatch(r, result([70, 95]), ["anna", "Ben"], 2);
  r = recordMatch(r, result([50, 50]), ["Anna", "Ben"], 3);
  r = recordMatch(r, result([40, 20], 5), ["ANNA", "Cem"], 4);
  assert.ok(saveRecords(store, r));
  const raw = JSON.parse(store.data.get(RECORDS_KEY) ?? "{}");
  assert.equal(raw.schema, "consolecheat-mash");
  assert.equal(raw.version, 1);

  const loaded = loadRecords(store);
  assert.equal(loaded.corrupt, false);
  assert.deepEqual(loaded.records.best[10], { cps: 9.5, name: "Ben", at: 2 });
  assert.deepEqual(loaded.records.best[5], { cps: 8, name: "ANNA", at: 4 });
  assert.equal(loaded.records.best[30], undefined);
  assert.deepEqual(loaded.records.wins, [
    { name: "Anna", wins: 2 },
    { name: "Ben", wins: 1 },
  ], "wins are case-insensitive per name, a tie adds none");
  assert.equal(loaded.records.matches.length, 4);
  assert.equal(loaded.records.matches[0]?.at, 4, "newest first");
  assert.equal(loaded.records.matches[1]?.winner, "tie");
});

test("autofire-flagged players never set the best CPS", () => {
  const r = recordMatch(emptyRecords(), result([200, 50], 10, [true, false]), ["Bot", "Mia"], 1);
  assert.deepEqual(r.best[10], { cps: 5, name: "Mia", at: 1 });
  assert.equal(r.wins[0]?.name, "Bot", "the win still counts");
});

test("only the last matches are kept", () => {
  let r = emptyRecords();
  for (let i = 0; i < MAX_MATCHES + 5; i++) r = recordMatch(r, result([i, 0]), ["A", "B"], i);
  assert.equal(r.matches.length, MAX_MATCHES);
  assert.equal(r.matches[0]?.at, MAX_MATCHES + 4);
});

test("a real match summary records cleanly", () => {
  let m = startMatch(0, 5);
  for (let i = 0; i < 10; i++) m = registerPress(m, 0, m.goAt + i * 150 + (i % 3) * 11).state;
  const r = recordMatch(emptyRecords(), summarize(m), ["P1", "P2"], 9);
  assert.equal(r.best[5]?.cps, 2);
  assert.deepEqual(parseRecords(serializeRecords(r)), { records: r, corrupt: false });
});

test("corrupt or foreign data falls back without throwing", () => {
  for (const raw of ["{", "null", "[]", "7", '{"schema":"x","version":1}', '{"schema":"consolecheat-mash","version":2}']) {
    const loaded = parseRecords(raw);
    assert.deepEqual(loaded.records, emptyRecords(), raw);
    assert.equal(loaded.corrupt, true, raw);
  }
  const good = recordMatch(emptyRecords(), result([10, 5]), ["A", "B"], 1);
  const mixed = JSON.parse(serializeRecords(good));
  mixed.best["7"] = { cps: 1, name: "x", at: 1 };
  mixed.best["10"].cps = "fast";
  mixed.wins.push({ name: "", wins: 2 });
  mixed.matches.push({ at: 1, duration: 10, names: ["A"], counts: [1, 2], winner: 0 });
  const partial = parseRecords(JSON.stringify(mixed));
  assert.equal(partial.corrupt, true);
  assert.equal(partial.records.best[10], undefined);
  assert.deepEqual(partial.records.wins, [{ name: "A", wins: 1 }]);
  assert.equal(partial.records.matches.length, 1);

  const throwing: StorageLike = {
    getItem: () => {
      throw new Error("blocked");
    },
    setItem: () => {
      throw new Error("full");
    },
    removeItem: () => {
      throw new Error("blocked");
    },
  };
  assert.deepEqual(loadRecords(throwing).records, emptyRecords());
  assert.equal(saveRecords(throwing, emptyRecords()), false);
  assert.equal(resetRecords(throwing), false);
});

test("reset removes only consolecheat-mash-v1", () => {
  const store = memory({
    [RECORDS_KEY]: serializeRecords(emptyRecords()),
    [LANG_KEY]: "en",
    [THEME_KEY]: "dark",
    "consolecheat-sfx-v1": "{}",
    "consolecheat-chiptune-v1": "{}",
  });
  assert.ok(resetRecords(store));
  assert.deepEqual([...store.data.keys()].sort(), ["consolecheat-chiptune-v1", "consolecheat-sfx-v1", LANG_KEY, THEME_KEY].sort());
});

test("names are trimmed, capped, and fall back", () => {
  assert.equal(cleanName("  Anna   B  ", "Spieler 1"), "Anna B");
  assert.equal(cleanName("   ", "Spieler 1"), "Spieler 1");
  assert.equal(cleanName("x".repeat(40), "P").length, 24);
});
