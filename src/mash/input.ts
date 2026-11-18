import type { Player } from "./match.ts";

// Keyboard and gamepad mapping. Pure helpers so node:test can check them.

export type Action = { type: "mash"; player: Player } | { type: "start" };

export type KeyLike = {
  key: string;
  code?: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  repeat?: boolean;
};

/** A = player 1, L = player 2, Space = start. Uses the physical key when available. */
export function keyAction(event: KeyLike): Action | null {
  if (event.ctrlKey || event.metaKey || event.altKey) return null;
  const code = event.code ?? "";
  const key = event.key.toLowerCase();
  if (code === "KeyA" || (!code && key === "a")) return { type: "mash", player: 0 };
  if (code === "KeyL" || (!code && key === "l")) return { type: "mash", player: 1 };
  if (code === "Space" || event.key === " ") return { type: "start" };
  return null;
}

/**
 * Rising edges for keys: a keydown counts only if the key was up before.
 * Auto-repeat keydowns (`repeat: true`) never count, and neither does a second
 * keydown without a keyup in between (some systems omit the repeat flag).
 */
export function createKeyEdges() {
  const held = new Set<string>();
  return {
    down(event: KeyLike): boolean {
      const id = event.code || event.key.toLowerCase();
      if (event.repeat || held.has(id)) {
        held.add(id);
        return false;
      }
      held.add(id);
      return true;
    },
    up(event: KeyLike) {
      held.delete(event.code || event.key.toLowerCase());
    },
    clear() {
      held.clear();
    },
  };
}

export type TargetLike = {
  tagName?: string;
  type?: string;
  isContentEditable?: boolean;
} | null;

const TEXT_INPUTS = new Set(["text", "search", "email", "url", "tel", "password", "number"]);

export function isTypingTarget(target: TargetLike): boolean {
  if (!target) return false;
  if (target.isContentEditable) return true;
  const tag = (target.tagName ?? "").toUpperCase();
  if (tag === "TEXTAREA" || tag === "SELECT") return true;
  if (tag === "INPUT") return TEXT_INPUTS.has((target.type ?? "text").toLowerCase());
  return false;
}

/** Text fields keep every key. Buttons, links, radios, and checkboxes keep Space. */
export function shortcutAllowed(action: Action, target: TargetLike): boolean {
  if (isTypingTarget(target)) return false;
  if (action.type !== "start") return true;
  const tag = (target?.tagName ?? "").toUpperCase();
  const type = (target?.type ?? "").toLowerCase();
  if (tag === "BUTTON" || tag === "A" || tag === "SUMMARY") return false;
  if (tag === "INPUT" && (type === "radio" || type === "checkbox" || type === "range")) return false;
  return true;
}

// Standard gamepad mapping (PlayStation labels).
export const PAD = { cross: 0, circle: 1, square: 2, triangle: 3, options: 9 } as const;
export const FACE_BUTTONS: readonly number[] = [PAD.cross, PAD.circle, PAD.square, PAD.triangle];

/**
 * Pad 1 and Pad 2 by gamepad index: the connected pad with the lowest index is
 * player 1, the next one player 2. Further pads are ignored.
 */
export function assignPads(indices: readonly number[]): Map<number, Player> {
  const sorted = [...new Set(indices)].sort((a, b) => a - b);
  const map = new Map<number, Player>();
  if (sorted[0] !== undefined) map.set(sorted[0], 0);
  if (sorted[1] !== undefined) map.set(sorted[1], 1);
  return map;
}

export function risingEdges(previous: readonly boolean[], current: readonly boolean[]): number[] {
  const edges: number[] = [];
  for (let i = 0; i < current.length; i++) {
    if (current[i] && !previous[i]) edges.push(i);
  }
  return edges;
}

export type PadLike = { index: number; buttons: readonly { pressed: boolean }[] } | null;

/**
 * Keeps the last button state per pad, so only a pressed transition counts.
 * The first poll of a pad (and the first one after it reconnects) only seeds that
 * state and emits nothing, so a button already held when the pad appears never fires.
 * With `blocked` set (a text field has focus) the state still follows the pad,
 * so a button held through the block does not fire afterwards.
 */
export function createPadTracker() {
  const last = new Map<number, boolean[]>();
  return {
    /** One poll of all pads. Returns the actions in pad order. */
    poll(pads: readonly PadLike[], blocked = false): Action[] {
      const live = pads.filter((pad): pad is NonNullable<PadLike> => Boolean(pad));
      const players = assignPads(live.map((pad) => pad.index));
      const actions: Action[] = [];
      for (const pad of live) {
        const current = pad.buttons.map((button) => Boolean(button.pressed));
        const previous = last.get(pad.index);
        last.set(pad.index, current);
        if (!previous || blocked) continue;
        const player = players.get(pad.index);
        if (player === undefined) continue;
        for (const index of risingEdges(previous, current)) {
          if (FACE_BUTTONS.includes(index)) actions.push({ type: "mash", player });
          else if (index === PAD.options) actions.push({ type: "start" });
        }
      }
      for (const index of [...last.keys()]) {
        if (!live.some((pad) => pad.index === index)) last.delete(index);
      }
      return actions;
    },
    /** Call on gamepaddisconnected, so the next poll after a reconnect seeds again. */
    forget(index: number) {
      last.delete(index);
    },
  };
}
