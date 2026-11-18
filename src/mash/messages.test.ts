import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { copy, fill, formatCps, initialLang, languageOptions } from "./messages.ts";
import { RECORDS_KEY } from "./records.ts";

function leaves(value: unknown, prefix = ""): string[] {
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, inner]) => leaves(inner, prefix ? `${prefix}.${key}` : key));
  }
  return [prefix];
}

test("German is the default and English has the same keys and placeholders", () => {
  assert.equal(languageOptions[0]?.id, "de");
  assert.equal(initialLang(null), "de");
  assert.equal(initialLang("xx"), "de");
  assert.equal(initialLang("en"), "en");
  assert.deepEqual(leaves(copy.de).sort(), leaves(copy.en).sort());
  for (const key of leaves(copy.de)) {
    const de = (copy.de as Record<string, unknown>)[key];
    const en = (copy.en as Record<string, unknown>)[key];
    assert.equal(typeof de, "string", key);
    assert.ok(String(de).trim() && String(en).trim(), key);
    const holes = (s: unknown) => (String(s).match(/\{[A-Za-z0-9]+\}/g) ?? []).sort();
    assert.deepEqual(holes(de), holes(en), key);
  }
});

test("copy covers countdown, false start, autofire, and the key", () => {
  assert.equal(copy.de.go, "Los!");
  assert.equal(copy.de.falseStart, "Fehlstart!");
  assert.equal(copy.de.autofire, "Autofire-Verdacht");
  assert.equal(copy.de.toolsHeading, "Weitere Werkzeuge");
  assert.match(copy.de.storageNote, new RegExp(RECORDS_KEY));
  assert.match(copy.de.deleteAsk, new RegExp(RECORDS_KEY));
  assert.match(copy.de.controls, /A/);
  assert.match(copy.de.controls, /Options/);
  assert.equal(fill(copy.de.wins, { name: "Anna" }), "Anna gewinnt!");
  assert.equal(formatCps(9.25, "de"), "9,3");
  assert.equal(formatCps(9.25, "en"), "9.3");
});

test("the page wires aria-live, labels, rAF polling, and reduced motion", () => {
  const ui = readFileSync(new URL("./Battle.tsx", import.meta.url), "utf8");
  const styles = readFileSync(new URL("./styles.css", import.meta.url), "utf8");
  assert.match(ui, /aria-live="assertive"/);
  assert.match(ui, /aria-live="polite"/);
  assert.match(ui, /htmlFor=\{`mash-name-\$\{player\}`\}/);
  assert.match(ui, /requestAnimationFrame\(poll\)/);
  assert.match(ui, /tracker\.poll\(list, blocked\)/);
  assert.match(ui, /onPointerDown/);
  assert.match(styles, /prefers-reduced-motion/);
  assert.match(styles, /\.rope-marker \{\s*transition: none;/);
  assert.match(styles, /390px/);
  assert.match(styles, /:focus-visible/);
});
