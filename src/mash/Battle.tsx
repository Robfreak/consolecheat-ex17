import { useEffect, useRef, useState } from "react";
import { createKeyEdges, createPadTracker, isTypingTarget, keyAction, shortcutAllowed, type Action, type TargetLike } from "./input.ts";
import {
  countdownNumber,
  DEFAULT_DURATION,
  DURATIONS,
  phaseAt,
  PLAYERS,
  registerPress,
  remainingMs,
  startMatch,
  type Duration,
  type MatchState,
  type Player,
} from "./match.ts";
import { fill, formatCps, type Copy, type Lang } from "./messages.ts";
import { cleanName, loadRecords, MAX_NAME, recordMatch, saveRecords, type LoadResult, type StorageLike } from "./records.ts";
import { rollingCps, summarize, tugPosition, type MatchResult } from "./stats.ts";

const GO_FLASH_MS = 700;

function browserStore(): StorageLike | null {
  try {
    localStorage.getItem("consolecheat-mash-v1");
    return localStorage;
  } catch {
    return null;
  }
}

function targetOf(element: Element | EventTarget | null): TargetLike {
  if (!element || !(element instanceof HTMLElement)) return null;
  return {
    tagName: element.tagName,
    type: element instanceof HTMLInputElement ? element.type : undefined,
    isContentEditable: element.isContentEditable,
  };
}

function langOf(text: Copy): Lang {
  return text.go === "Los!" ? "de" : "en";
}

export function Battle({ text }: { text: Copy }) {
  const lang = langOf(text);
  const [names, setNames] = useState<[string, string]>(["", ""]);
  const [duration, setDuration] = useState<Duration>(DEFAULT_DURATION);
  const [match, setMatch] = useState<MatchState | null>(null);
  const [result, setResult] = useState<MatchResult | null>(null);
  const [newBest, setNewBest] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [store] = useState(browserStore);
  const [records, setRecords] = useState<LoadResult>(() =>
    store ? loadRecords(store) : { records: { best: {}, wins: [], matches: [] }, corrupt: false },
  );
  const [pads, setPads] = useState(0);
  const [, setTick] = useState(0);

  const matchRef = useRef<MatchState | null>(null);
  const recordsRef = useRef(records);
  const finished = useRef(true);
  const textRef = useRef(text);
  textRef.current = text;

  const playerName = (player: Player, source: [string, string] = names) =>
    cleanName(source[player], fill(textRef.current.playerLabel, { n: player + 1 }));

  const now = performance.now();
  const phase = match ? phaseAt(match, now) : null;
  const active = phase === "countdown" || phase === "running";

  function start() {
    const current = matchRef.current;
    if (current && phaseAt(current, performance.now()) !== "done") return;
    if (current && !finished.current) return;
    const next = startMatch(performance.now(), duration);
    matchRef.current = next;
    finished.current = false;
    setMatch(next);
    setResult(null);
    setNewBest(false);
    setSaveFailed(false);
  }

  function press(player: Player) {
    const current = matchRef.current;
    if (!current || finished.current) return;
    const { state } = registerPress(current, player, performance.now());
    if (state !== current) {
      matchRef.current = state;
      setMatch(state);
    }
  }

  function run(action: Action) {
    if (action.type === "mash") press(action.player);
    else start();
  }
  const runRef = useRef(run);
  runRef.current = run;

  // Frame loop while a round is on: re-render for the countdown, timer, and live rate.
  useEffect(() => {
    if (!match || finished.current) return;
    let frame = 0;
    const loop = () => {
      const current = matchRef.current;
      if (!current) return;
      if (phaseAt(current, performance.now()) === "done") {
        finished.current = true;
        const summary = summarize(current);
        setResult(summary);
        const finalNames: [string, string] = [playerName(0), playerName(1)];
        const loaded = recordsRef.current;
        const next = recordMatch(loaded.records, summary, finalNames, Date.now());
        const before = loaded.records.best[current.duration]?.cps ?? 0;
        const after = next.best[current.duration]?.cps ?? 0;
        setNewBest(after > before);
        const ok = store ? saveRecords(store, next) : false;
        setSaveFailed(!ok);
        const updated = { records: next, corrupt: ok ? false : loaded.corrupt };
        recordsRef.current = updated;
        setRecords(updated);
        setTick((n) => n + 1);
        return;
      }
      setTick((n) => n + 1);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match?.startedAt]);

  // Keyboard: A and L mash, Space starts. Only rising edges count.
  useEffect(() => {
    const edges = createKeyEdges();
    const onDown = (event: KeyboardEvent) => {
      const action = keyAction(event);
      if (!action || !shortcutAllowed(action, targetOf(event.target))) return;
      event.preventDefault();
      if (!edges.down(event)) return;
      runRef.current(action);
    };
    const onUp = (event: KeyboardEvent) => edges.up(event);
    const onBlur = () => edges.clear();
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  // Gamepads: polled with requestAnimationFrame. The first poll of a pad only seeds its state.
  useEffect(() => {
    if (typeof navigator.getGamepads !== "function") return;
    const tracker = createPadTracker();
    let frame = 0;
    let running = false;
    const poll = () => {
      const list = [...navigator.getGamepads()];
      const count = list.filter(Boolean).length;
      setPads(count);
      const blocked = isTypingTarget(targetOf(document.activeElement));
      for (const action of tracker.poll(list, blocked)) runRef.current(action);
      if (count > 0) frame = requestAnimationFrame(poll);
      else running = false;
    };
    const begin = () => {
      if (running) return;
      running = true;
      frame = requestAnimationFrame(poll);
    };
    const onDisconnect = (event: GamepadEvent) => {
      tracker.forget(event.gamepad.index);
      setPads(navigator.getGamepads().filter(Boolean).length);
    };
    window.addEventListener("gamepadconnected", begin);
    window.addEventListener("gamepaddisconnected", onDisconnect);
    if (navigator.getGamepads().some(Boolean)) begin();
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("gamepadconnected", begin);
      window.removeEventListener("gamepaddisconnected", onDisconnect);
    };
  }, []);

  const counts: [number, number] = match ? [match.presses[0].length, match.presses[1].length] : [0, 0];
  const position = tugPosition(counts[0], counts[1]);
  const n0 = playerName(0);
  const n1 = playerName(1);
  const shown = [n0, n1] as const;
  const countdown = match ? countdownNumber(match, now) : 0;
  let announce = "";
  if (match && phase === "countdown") announce = String(countdown);
  else if (match && phase === "running" && now - match.goAt < GO_FLASH_MS) announce = text.go;
  const secondsLeft = match ? Math.ceil(remainingMs(match, now) / 1000) : duration;
  const best = records.records.best;

  return (
    <div className="flex flex-col gap-4">
      <div className="panel rounded-xl px-4 py-4">
        <h3 className="font-display text-lg font-semibold tracking-tight">{text.setupHeading}</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {PLAYERS.map((player) => (
            <div key={player}>
              <label htmlFor={`mash-name-${player}`} className="text-sm font-medium">
                {fill(text.nameLabel, { n: player + 1 })}
              </label>
              <input
                id={`mash-name-${player}`}
                type="text"
                className="field mt-1"
                maxLength={MAX_NAME}
                value={names[player]}
                placeholder={fill(text.playerLabel, { n: player + 1 })}
                disabled={active}
                onChange={(event) => {
                  const value = event.target.value;
                  setNames((current) => (player === 0 ? [value, current[1]] : [current[0], value]));
                }}
              />
            </div>
          ))}
        </div>
        <fieldset className="mt-4" disabled={active}>
          <legend className="text-sm font-medium">{text.durationLabel}</legend>
          <div className="seg mt-2">
            {DURATIONS.map((value) => (
              <span key={value}>
                <input
                  id={`mash-dur-${value}`}
                  type="radio"
                  name="mash-duration"
                  className="sr-only"
                  checked={duration === value}
                  onChange={() => setDuration(value)}
                />
                <label htmlFor={`mash-dur-${value}`}>{fill(text.seconds, { s: value })}</label>
              </span>
            ))}
          </div>
        </fieldset>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" className="btn btn-primary" disabled={active} onClick={start}>
            {result ? text.rematch : text.start}
          </button>
          <span className="text-sm text-muted">{text.startHint}</span>
          <span className="text-sm text-subtle">{pads > 0 ? fill(text.padsConnected, { n: pads }) : text.padsNone}</span>
        </div>
      </div>

      <div className="panel arena rounded-xl px-4 py-4" data-phase={phase ?? "idle"}>
        <div className="flex items-center justify-between gap-2 text-sm text-muted">
          <span>{match ? fill(text.timeLeft, { s: secondsLeft }) : text.ready}</span>
          <span className="font-mono">{fill(text.seconds, { s: match?.duration ?? duration })}</span>
        </div>
        <div className="countdown-slot">
          <p className="countdown" role="status" aria-live="assertive" aria-label={text.countdownLabel}>
            {announce}
          </p>
        </div>
        <div className="players">
          {PLAYERS.map((player) => {
            const live = match ? rollingCps(match.presses[player], now) : 0;
            return (
              <div key={player} className={`side side-${player + 1}`}>
                <p className="truncate font-display text-lg font-semibold" title={shown[player]}>
                  {shown[player]}
                </p>
                <p className="text-xs text-subtle">{fill(text.keyHint, { key: player === 0 ? "A" : "L" })} · Pad {player + 1}</p>
                <p className="count font-display" aria-label={`${text.presses}: ${counts[player]}`}>
                  {counts[player]}
                </p>
                <p className="text-sm text-muted">
                  {formatCps(live, lang)} {text.cpsLive}
                </p>
                {match?.falseStart[player] ? <p className="mt-1 text-sm font-semibold text-bad">{text.falseStart}</p> : null}
                <button
                  type="button"
                  tabIndex={-1}
                  className="tap-pad"
                  aria-label={fill(text.tapLabel, { name: shown[player] })}
                  onPointerDown={(event) => {
                    event.preventDefault();
                    press(player);
                  }}
                  onContextMenu={(event) => event.preventDefault()}
                >
                  {text.tap}
                </button>
              </div>
            );
          })}
        </div>
        <div
          className="rope"
          role="img"
          aria-label={fill(text.ropeLabel, { name1: n0, c1: counts[0], name2: n1, c2: counts[1] })}
        >
          <div className="rope-line" />
          <div className="rope-center" />
          <div className="rope-marker" style={{ left: `${50 + position * 45}%` }} />
        </div>
      </div>

      <div aria-live="polite">
        {result ? (
          <section className="panel rounded-xl px-4 py-4" aria-labelledby="result-heading">
            <h3 id="result-heading" className="font-display text-lg font-semibold tracking-tight">
              {text.resultHeading}
            </h3>
            <p className="mt-2 font-display text-2xl font-semibold">
              {result.winner === "tie" ? text.tie : fill(text.wins, { name: shown[result.winner] })}
            </p>
            {newBest ? <p className="mt-1 text-sm font-semibold text-ok">{fill(text.newBest, { s: result.duration })}</p> : null}
            {saveFailed ? <p className="mt-1 text-sm text-warn">{text.saveFailed}</p> : null}
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {PLAYERS.map((player) => {
                const r = result.players[player];
                return (
                  <div key={player} className="rounded-lg border border-line px-3 py-3">
                    <p className="font-semibold">{shown[player]}</p>
                    <dl className="stats mt-2 text-sm">
                      <dt>{text.statCount}</dt>
                      <dd>{r.count}</dd>
                      <dt>{text.statAverage}</dt>
                      <dd>{fill(text.cpsValue, { v: formatCps(r.average, lang) })}</dd>
                      <dt>{text.statPeak}</dt>
                      <dd>{fill(text.cpsValue, { v: formatCps(r.peak, lang) })}</dd>
                      <dt>{text.statDropped}</dt>
                      <dd>{r.dropped}</dd>
                    </dl>
                    {r.falseStart ? (
                      <p className="mt-2 text-sm text-bad">{fill(text.falseStartNote, { name: shown[player] })}</p>
                    ) : null}
                    {r.autofire ? (
                      <p className="mt-2 text-sm text-warn">
                        <strong>{text.autofire}:</strong> {r.autofire === "rate" ? text.autofireRate : text.autofireRegular}{" "}
                        {text.autofireNoRecord}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
            <button type="button" className="btn btn-primary mt-4" onClick={start}>
              {text.rematch}
            </button>
          </section>
        ) : null}
      </div>

      <section className="panel rounded-xl px-4 py-4" aria-labelledby="records-heading">
        <h3 id="records-heading" className="font-display text-lg font-semibold tracking-tight">
          {text.recordsHeading}
        </h3>
        {records.corrupt ? <p className="mt-2 text-sm text-warn">{text.recordsCorrupt}</p> : null}
        <div className="mt-3 grid gap-4 md:grid-cols-3">
          <div>
            <h4 className="text-sm font-semibold">{text.bestHeading}</h4>
            <ul className="mt-2 text-sm text-muted">
              {DURATIONS.map((value) => {
                const entry = best[value];
                return (
                  <li key={value}>
                    <span className="font-mono text-fg">{fill(text.seconds, { s: value })}</span>:{" "}
                    {entry ? fill(text.bestValue, { v: formatCps(entry.cps, lang), name: entry.name }) : text.noBest}
                  </li>
                );
              })}
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold">{text.winsHeading}</h4>
            {records.records.wins.length ? (
              <ol className="mt-2 text-sm text-muted">
                {records.records.wins.slice(0, 8).map((entry) => (
                  <li key={entry.name}>
                    <span className="text-fg">{entry.name}</span>: {fill(text.winsValue, { n: entry.wins })}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-2 text-sm text-subtle">{text.noMatches}</p>
            )}
          </div>
          <div>
            <h4 className="text-sm font-semibold">{text.recentHeading}</h4>
            {records.records.matches.length ? (
              <ul className="mt-2 text-sm text-muted">
                {records.records.matches.map((m) => (
                  <li key={`${m.at}-${m.names.join("-")}`}>
                    {fill(text.matchLine, { name1: m.names[0], c1: m.counts[0], c2: m.counts[1], name2: m.names[1], s: m.duration })}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-subtle">{text.noMatches}</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
