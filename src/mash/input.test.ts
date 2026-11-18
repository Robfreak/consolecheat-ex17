import assert from "node:assert/strict";
import test from "node:test";
import { assignPads, createKeyEdges, createPadTracker, isTypingTarget, keyAction, PAD, risingEdges, shortcutAllowed, type PadLike } from "./input.ts";

test("keyboard mapping: A is player 1, L is player 2, Space starts", () => {
  assert.deepEqual(keyAction({ key: "a", code: "KeyA" }), { type: "mash", player: 0 });
  assert.deepEqual(keyAction({ key: "A", code: "KeyA" }), { type: "mash", player: 0 });
  assert.deepEqual(keyAction({ key: "l", code: "KeyL" }), { type: "mash", player: 1 });
  assert.deepEqual(keyAction({ key: "l" }), { type: "mash", player: 1 });
  assert.deepEqual(keyAction({ key: " ", code: "Space" }), { type: "start" });
  assert.equal(keyAction({ key: "a", code: "KeyA", ctrlKey: true }), null, "Ctrl+A stays select-all");
  assert.equal(keyAction({ key: "b", code: "KeyB" }), null);
});

test("key edges: repeats and held keys never count", () => {
  const edges = createKeyEdges();
  assert.equal(edges.down({ key: "a", code: "KeyA" }), true);
  assert.equal(edges.down({ key: "a", code: "KeyA", repeat: true }), false, "auto-repeat");
  assert.equal(edges.down({ key: "a", code: "KeyA" }), false, "second keydown without keyup");
  assert.equal(edges.down({ key: "l", code: "KeyL" }), true, "the other player is independent");
  edges.up({ key: "a", code: "KeyA" });
  assert.equal(edges.down({ key: "a", code: "KeyA" }), true);
  assert.equal(edges.down({ key: "l", code: "KeyL", repeat: true }), false);
  edges.clear();
  assert.equal(edges.down({ key: "l", code: "KeyL" }), true, "blur clears held keys");
  const fresh = createKeyEdges();
  assert.equal(fresh.down({ key: "a", code: "KeyA", repeat: true }), false, "a repeat never counts, even first");
});

test("shortcuts never fire while a text input is focused", () => {
  const text = { tagName: "INPUT", type: "text" };
  assert.ok(isTypingTarget(text));
  assert.equal(shortcutAllowed({ type: "mash", player: 0 }, text), false);
  assert.equal(shortcutAllowed({ type: "start" }, text), false);
  assert.equal(shortcutAllowed({ type: "start" }, { tagName: "TEXTAREA" }), false);
  assert.equal(shortcutAllowed({ type: "start" }, { tagName: "BUTTON" }), false, "Space activates the button");
  assert.equal(shortcutAllowed({ type: "start" }, { tagName: "INPUT", type: "radio" }), false);
  assert.equal(shortcutAllowed({ type: "mash", player: 1 }, { tagName: "BUTTON" }), true);
  assert.equal(shortcutAllowed({ type: "start" }, { tagName: "BODY" }), true);
  assert.equal(shortcutAllowed({ type: "start" }, null), true);
});

const pad = (index: number, pressed: number[]): PadLike => ({
  index,
  buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: pressed.includes(i) })),
});

test("pads are assigned by index: lowest is player 1, next is player 2", () => {
  assert.deepEqual([...assignPads([0, 1])], [[0, 0], [1, 1]]);
  assert.deepEqual([...assignPads([3, 1])], [[1, 0], [3, 1]]);
  assert.deepEqual([...assignPads([2])], [[2, 0]]);
  assert.equal(assignPads([0, 1, 2]).has(2), false, "a third pad is ignored");
  assert.deepEqual(risingEdges([true, false], [true, true]), [1]);
});

test("the first poll of each pad only seeds its state", () => {
  const tracker = createPadTracker();
  // Both pads appear with × already held: nothing fires.
  assert.deepEqual(tracker.poll([pad(0, [PAD.cross]), pad(1, [PAD.options])]), []);
  // Still held: nothing.
  assert.deepEqual(tracker.poll([pad(0, [PAD.cross]), pad(1, [PAD.options])]), []);
  // Release and press again: now it counts.
  assert.deepEqual(tracker.poll([pad(0, []), pad(1, [])]), []);
  assert.deepEqual(tracker.poll([pad(0, [PAD.cross]), pad(1, [])]), [{ type: "mash", player: 0 }]);
});

test("after a reconnect the first poll seeds again", () => {
  const tracker = createPadTracker();
  tracker.poll([pad(0, []), pad(1, [])]);
  // Pad 2 disappears (missing from the poll) and comes back with □ held.
  tracker.poll([pad(0, []), null]);
  assert.deepEqual(tracker.poll([pad(0, []), pad(1, [PAD.square])]), [], "reconnected pad only seeds");
  assert.deepEqual(tracker.poll([pad(0, []), pad(1, [])]), []);
  assert.deepEqual(tracker.poll([pad(0, []), pad(1, [PAD.square])]), [{ type: "mash", player: 1 }]);
  // forget() (gamepaddisconnected) has the same effect.
  tracker.forget(0);
  assert.deepEqual(tracker.poll([pad(0, [PAD.triangle]), pad(1, [PAD.square])]), []);
});

test("two mocked pads: every face button mashes, Options starts, holding does not repeat", () => {
  const tracker = createPadTracker();
  tracker.poll([pad(0, []), pad(1, [])]);
  assert.deepEqual(tracker.poll([pad(0, [PAD.cross]), pad(1, [PAD.circle])]), [
    { type: "mash", player: 0 },
    { type: "mash", player: 1 },
  ]);
  assert.deepEqual(tracker.poll([pad(0, [PAD.cross]), pad(1, [PAD.circle])]), [], "held buttons do not count");
  assert.deepEqual(tracker.poll([pad(0, [PAD.cross, PAD.square]), pad(1, [PAD.circle, PAD.triangle])]), [
    { type: "mash", player: 0 },
    { type: "mash", player: 1 },
  ]);
  assert.deepEqual(tracker.poll([pad(0, []), pad(1, [])]), []);
  assert.deepEqual(tracker.poll([pad(0, [PAD.options]), pad(1, [])]), [{ type: "start" }]);
  assert.deepEqual(tracker.poll([pad(0, [12, 13, 4, 5]), pad(1, [])]), [], "D-pad and shoulders do nothing");
});

test("a blocked poll (text field focused) follows the pad but emits nothing", () => {
  const tracker = createPadTracker();
  tracker.poll([pad(0, [])]);
  assert.deepEqual(tracker.poll([pad(0, [PAD.cross])], true), []);
  assert.deepEqual(tracker.poll([pad(0, [PAD.cross])]), [], "held through the block: no late fire");
  assert.deepEqual(tracker.poll([pad(0, [])]), []);
  assert.deepEqual(tracker.poll([pad(0, [PAD.cross])]), [{ type: "mash", player: 0 }]);
});
