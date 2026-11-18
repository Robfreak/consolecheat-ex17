export const languageOptions = [
  { id: "de", label: "Deutsch" },
  { id: "en", label: "English" },
] as const;

export type Lang = (typeof languageOptions)[number]["id"];

const de = {
  brand: "consolecheat",
  title: "Button-Mash-Battle",
  metaDescription:
    "Button-Mash-Battle: Zwei Spieler hämmern an einem Gerät auf ihre Taste, per Controller oder Tastatur, mit Tauziehen und lokalen Rekorden. Alles bleibt in diesem Browser. Inoffiziell, nicht von Sony.",
  eyebrow: "Werkzeug · Party",
  lede: "Zwei Spieler, ein Gerät: Wer in der Runde öfter drückt, zieht das Seil zu sich. Mit Controller, Tastatur oder Touch, mit Fehlstart-Erkennung, Autofire-Verdacht und lokalen Rekorden.",
  freeClaim: "Komplett kostenlos. Auf dieser Seite kostet nichts Geld.",
  privacyClaim: "Keine sensiblen Daten werden gespeichert. Rekorde und Namen bleiben in diesem Browser und werden nicht hochgeladen.",
  unofficial: "Inoffiziell. Nicht von Sony.",
  footerNote: "Die Rekorde bleiben auf diesem Gerät. Diese Seite ist nicht Sony.",
  themeDark: "Dunkles Erscheinungsbild",
  themeLight: "Helles Erscheinungsbild",
  language: "Sprache",
  footerNav: "Seitenfuß",
  toolsHeading: "Weitere Werkzeuge",
  merkliste: "Zur Merkliste",
  storageNote: "Rekorde, Siege und die letzten Matches liegen im localStorage unter consolecheat-mash-v1.",
  controlsHeading: "Steuerung",
  controls:
    "Spieler 1 drückt A, Spieler 2 drückt L. Leertaste startet die Runde. Controller: Der Controller mit der kleinsten Nummer ist Spieler 1, der nächste Spieler 2. Jede der Tasten ×, ○, □ und △ zählt als Druck, Options startet die Runde. Auf Touch-Geräten tippt jede Seite auf ihr eigenes Feld. Nur ein neuer Druck zählt: Gedrückt halten und automatische Tastenwiederholung zählen nicht. Solange ein Textfeld den Fokus hat, greifen die Tasten nicht.",
  setupHeading: "Runde einstellen",
  playerLabel: "Spieler {n}",
  nameLabel: "Name von Spieler {n}",
  durationLabel: "Rundenlänge",
  seconds: "{s} s",
  start: "Runde starten",
  rematch: "Revanche",
  startHint: "Leertaste oder Options startet.",
  keyHint: "Taste {key}",
  tap: "Hier tippen",
  tapLabel: "Druck für {name}",
  ready: "Bereit",
  go: "Los!",
  countdownLabel: "Countdown",
  presses: "Drücke",
  cpsLive: "pro Sekunde",
  timeLeft: "Noch {s} s",
  falseStart: "Fehlstart!",
  falseStartNote: "{name} hat vor „Los“ gedrückt. Diese Drücke zählen nicht.",
  ropeLabel: "Tauziehen: {name1} {c1}, {name2} {c2}",
  resultHeading: "Ergebnis",
  wins: "{name} gewinnt!",
  tie: "Unentschieden!",
  statCount: "Drücke",
  statAverage: "Durchschnitt",
  statPeak: "Spitze (1 s)",
  statDropped: "Verworfen (unter 25 ms)",
  cpsValue: "{v}/s",
  autofire: "Autofire-Verdacht",
  autofireRate: "Mehr als 25 Drücke pro Sekunde oder viele Drücke unter 25 ms Abstand.",
  autofireRegular: "Die Abstände zwischen den Drücken sind verdächtig gleichmäßig.",
  autofireNoRecord: "Mit Autofire-Verdacht zählt die Runde nicht für den Bestwert.",
  newBest: "Neuer Bestwert für {s} s!",
  recordsHeading: "Rekorde",
  bestHeading: "Bestwert pro Rundenlänge",
  bestValue: "{v}/s · {name}",
  noBest: "noch keiner",
  winsHeading: "Siege",
  winsValue: "{n} Siege",
  recentHeading: "Letzte Matches",
  noMatches: "Noch keine Matches gespielt.",
  matchLine: "{name1} {c1} : {c2} {name2} ({s} s)",
  recordsCorrupt: "Ein Teil der gespeicherten Rekorde war unlesbar und wurde übersprungen. Beim nächsten Match werden sie neu geschrieben.",
  saveFailed: "Die Rekorde konnten nicht gespeichert werden. Der Speicher des Browsers ist voll oder gesperrt.",
  padsConnected: "{n} Controller verbunden.",
  padsNone: "Kein Controller verbunden. Tastatur und Touch gehen immer.",
  deleteAll: "Rekorde löschen",
  deleteAsk:
    "Wirklich die Rekorde in diesem Browser löschen? Nur der Schlüssel consolecheat-mash-v1. Sprache und Erscheinungsbild bleiben.",
  deleteYes: "Nur die Rekorde löschen",
  deleteNo: "Abbrechen",
  deleted: "Die Rekorde sind aus diesem Browser gelöscht.",
  deleteFailed: "Die Rekorde konnten nicht gelöscht werden.",
};

export type Copy = typeof de;

const en: Copy = {
  brand: "consolecheat",
  title: "Button mash battle",
  metaDescription:
    "Button mash battle: two players mash their button on one device, with controller or keyboard, a tug of war, and local records. Everything stays in this browser. Unofficial, not from Sony.",
  eyebrow: "Tool · Party",
  lede: "Two players, one device: whoever presses more often in the round pulls the rope their way. Controller, keyboard, or touch, with false-start detection, autofire suspicion, and local records.",
  freeClaim: "Completely free. This page does not charge anything.",
  privacyClaim: "No sensitive data is stored. Records and names stay in this browser and are not uploaded.",
  unofficial: "Unofficial. Not from Sony.",
  footerNote: "The records stay on this device. This page is not Sony.",
  themeDark: "Dark appearance",
  themeLight: "Light appearance",
  language: "Language",
  footerNav: "Footer",
  toolsHeading: "Other tools",
  merkliste: "Back to the backlog",
  storageNote: "Records, wins, and the last matches use the localStorage key consolecheat-mash-v1.",
  controlsHeading: "Controls",
  controls:
    "Player 1 presses A, player 2 presses L. Space starts the round. Controller: the controller with the lowest number is player 1, the next one player 2. Each of ×, ○, □, and △ counts as a press, Options starts the round. On touch screens each side taps its own pad. Only a new press counts: holding a key and key auto-repeat do not. While a text field has focus, the keys are left alone.",
  setupHeading: "Set up the round",
  playerLabel: "Player {n}",
  nameLabel: "Name of player {n}",
  durationLabel: "Round length",
  seconds: "{s} s",
  start: "Start round",
  rematch: "Rematch",
  startHint: "Space or Options starts.",
  keyHint: "Key {key}",
  tap: "Tap here",
  tapLabel: "Press for {name}",
  ready: "Ready",
  go: "Go!",
  countdownLabel: "Countdown",
  presses: "Presses",
  cpsLive: "per second",
  timeLeft: "{s} s left",
  falseStart: "False start!",
  falseStartNote: "{name} pressed before “Go”. Those presses do not count.",
  ropeLabel: "Tug of war: {name1} {c1}, {name2} {c2}",
  resultHeading: "Result",
  wins: "{name} wins!",
  tie: "It’s a tie!",
  statCount: "Presses",
  statAverage: "Average",
  statPeak: "Peak (1 s)",
  statDropped: "Dropped (under 25 ms)",
  cpsValue: "{v}/s",
  autofire: "Autofire suspected",
  autofireRate: "More than 25 presses per second, or many presses under 25 ms apart.",
  autofireRegular: "The gaps between presses are suspiciously even.",
  autofireNoRecord: "With autofire suspected, the round does not count for the best score.",
  newBest: "New best for {s} s!",
  recordsHeading: "Records",
  bestHeading: "Best per round length",
  bestValue: "{v}/s · {name}",
  noBest: "none yet",
  winsHeading: "Wins",
  winsValue: "{n} wins",
  recentHeading: "Last matches",
  noMatches: "No matches played yet.",
  matchLine: "{name1} {c1} : {c2} {name2} ({s} s)",
  recordsCorrupt: "Part of the saved records could not be read and was skipped. They are rewritten after the next match.",
  saveFailed: "The records could not be saved. The browser storage is full or blocked.",
  padsConnected: "{n} controller(s) connected.",
  padsNone: "No controller connected. Keyboard and touch always work.",
  deleteAll: "Delete records",
  deleteAsk:
    "Really delete the records in this browser? Only the key consolecheat-mash-v1. Language and appearance stay.",
  deleteYes: "Delete only the records",
  deleteNo: "Cancel",
  deleted: "The records are deleted from this browser.",
  deleteFailed: "The records could not be deleted.",
};

export const copy: Record<Lang, Copy> = { de, en };

const ids = new Set<string>(languageOptions.map((item) => item.id));

export function isLang(value: string | null): value is Lang {
  return value !== null && ids.has(value);
}

export function initialLang(stored: string | null): Lang {
  return isLang(stored) ? stored : "de";
}

export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{([A-Za-z0-9]+)\}/g, (all, key: string) => {
    const value = values[key];
    return value === undefined ? all : String(value);
  });
}

export function formatCps(value: number, lang: Lang): string {
  return value.toLocaleString(lang === "de" ? "de-DE" : "en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}
