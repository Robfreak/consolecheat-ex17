# Button-Mash-Battle

Zwei Spieler, ein Gerät: Wer in der Runde öfter drückt, zieht das Seil zu sich. Teil der inoffiziellen consolecheat-Werkzeuge rund um [consolecheat.com](https://consolecheat.com). German is the primary language, English is the other. Light and dark theme, self-hosted fonts, footer, Impressum, and Datenschutz are included.

No account, no tracking, nothing uploaded. Fonts (Outfit, Source Sans 3) are self-hosted from `@fontsource`, so the page makes no request to Google or any other third party. The Impressum fields are placeholders until the operator fills them in. No name or address was invented.

Site: <https://robfreak.github.io/consolecheat-ex17/>

Inoffiziell. Nicht von Sony.

## Features

- **Two players on one device.** Names are optional (up to 24 characters). Empty names become "Spieler 1" / "Spieler 2".
- **Rundenlänge** 5, 10, 15, 20, or 30 s (default 10 s).
- **Countdown** 3, 2, 1, **Los!** (3 s). Presses before "Los" do not count. A player who presses during the countdown gets a **Fehlstart!** badge, shown again on the result screen.
- **Tug of war:** the marker moves toward the leading player in proportion to the press difference. A lead of 20 presses pulls it all the way. It slides with a short CSS transition, which is off under `prefers-reduced-motion`.
- **Live presses per second** for each player (rolling 1 s window), plus the round average and the 1 s peak on the result screen.
- **Result** with winner or tie, presses, average, peak, dropped presses, false start, and autofire notes. **Revanche** starts the same setup again.
- **Anti-autofire:**
  - Only rising edges count. Key auto-repeat (`repeat: true`) and a second keydown without a keyup are ignored. On a gamepad only a released→pressed transition counts.
  - Per player, a press less than 25 ms after the last counted one is dropped.
  - **Autofire-Verdacht** is shown when the 1 s peak is above 25 presses, when 5 or more presses were dropped by the 25 ms rule, or when the gaps between at least 16 presses are too even (coefficient of variation below 0.05).
  - A flagged player still wins or loses the match, but their rate never becomes a best score.
- **Local records:** best average CPS per round length (with the name), wins per player name (case-insensitive, ties add none), and the last 10 matches.

## Controls

| Action | Keyboard | Controller (standard mapping) | Touch |
| --- | --- | --- | --- |
| Player 1 presses | A | Pad 1: ×, ○, □, or △ | left tap pad |
| Player 2 presses | L | Pad 2: ×, ○, □, or △ | right tap pad |
| Start / Rematch | Space | Options on either pad | **Runde starten** |

Pad 1 is the connected gamepad with the lowest index, Pad 2 the next one. A third pad is ignored. The first poll of each pad (also after a reconnect) only records which buttons are already held and triggers nothing, so a button held while the pad connects never counts or starts a round. Pads are polled with `requestAnimationFrame`.

While a text field has focus (for example a name field), no shortcut fires and gamepad input is ignored, and a button held through that time does not fire afterwards. A focused button or radio keeps Space for itself. The tap pads react to `pointerdown` and are left out of the tab order, because keyboard players use A and L.

The countdown is an `aria-live="assertive"` region, the result an `aria-live="polite"` region, and all inputs have labels. The layout works down to 390px.

## Storage

- `consolecheat-mash-v1` (localStorage): `{ "schema": "consolecheat-mash", "version": 1, "best": { "10": { "cps", "name", "at" } }, "wins": [{ "name", "wins" }], "matches": [{ "at", "duration", "names", "counts", "winner" }] }`. It is created after the first finished match. A value that does not parse, a foreign schema, or another version falls back to empty records and does not crash. Single broken entries are skipped.
- `consolecheat-lang` and `consolecheat-theme` (localStorage, shared with the other consolecheat tools on robfreak.github.io)

The Datenschutz page names the key, says everything stays in the browser, cites Art. 6 Abs. 1 lit. f DSGVO for the host’s connection logs, and has a button that removes only `consolecheat-mash-v1`. Nothing else is stored.

## Run and test

```bash
npm install
npm test        # node --experimental-strip-types --test src/mash/*.test.ts
npm run dev     # http://127.0.0.1:5173/consolecheat-ex17/
npm run build   # typecheck, Vite build (base /consolecheat-ex17/), offline check of dist/
npm run preview # http://127.0.0.1:4173/consolecheat-ex17/
```

Node `>=22.6` (`package.json` `engines`).

## Files

- `index.html`: the HTML entry (Vite input)
- `src/mash/`: React + TypeScript source, styles, and tests
  - `match.ts` (countdown and round state, false starts, 25 ms cap), `stats.ts` (rolling CPS, peak, tug position, winner, autofire), `input.ts` (keyboard edges, gamepad tracker and pad assignment), `records.ts` (storage)
  - `Battle.tsx` (the game), `App.tsx`, `chrome.tsx`, `legal.tsx`, `messages.ts` (DE/EN)
  - `tools.ts` and `tool-links.tsx`: the footer list **Weitere Werkzeuge** (keep it identical across the consolecheat repos)
- `public/`: `favicon.svg`, `FONT-OFL.txt`, `.nojekyll`
- `scripts/check-dist.mjs`: offline check of `dist/` (no third-party hosts, no `.woff` fallback, woff2 fonts present)
- `.github/workflows/pages.yml`: test, build, and deploy to `gh-pages`

## Other tools

The footer group **Weitere Werkzeuge** (English: **Other tools**) links to the other consolecheat tools: Title-ID-Finder (ex1), PS-Plus-Archiv (ex2), Controller-Tester (ex3), Save-Info-Leser (ex4), Fehlercode-Nachschlager (ex5), the [Spiele-Merkliste](https://robfreak.github.io/consolecheat-ex6/), [Bildschirm-Test](https://robfreak.github.io/consolecheat-ex7/), [Download-Zeit-Rechner](https://robfreak.github.io/consolecheat-ex8/), [Tastenbelegung](https://robfreak.github.io/consolecheat-ex9/), [HDR/Helligkeit](https://robfreak.github.io/consolecheat-ex10/), [Audio-Kanal-Test](https://robfreak.github.io/consolecheat-ex11/), [USB-Stick-Checkliste](https://robfreak.github.io/consolecheat-ex12/), [Combo-Trainer](https://robfreak.github.io/consolecheat-ex13/), [Sprite-Animator](https://robfreak.github.io/consolecheat-ex14/), [Chiptune-Sequencer](https://robfreak.github.io/consolecheat-ex15/), and [Retro-Sound-Effekt-Generator](https://robfreak.github.io/consolecheat-ex16/). These are ordinary links. The page does not request those sites.

## GitHub Pages

`.github/workflows/pages.yml` runs install, test, and build on pull requests and on every push. A push to `main` also pushes `dist/` to the orphan branch `gh-pages` (`peaceiris/actions-gh-pages`, Jekyll off). Vite `base` is `/consolecheat-ex17/`, which matches the project site <https://robfreak.github.io/consolecheat-ex17/>.

Enable once in the repository settings:

1. **Settings → Actions → General → Workflow permissions → Read and write permissions.** Save.
2. **Settings → Pages → Build and deployment → Source: Deploy from a branch.** Branch: **`gh-pages`**, folder: **`/ (root)`.** Save.

After that, every push to `main` updates the site.

## Credits

Outfit and Source Sans 3 are bundled from `@fontsource` under the SIL Open Font License; see `public/FONT-OFL.txt` and `THIRD_PARTY_NOTICES.md`.

Replace the Impressum placeholders with the operator’s real details before treating that page as a legal notice.
