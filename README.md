# Arabic Scrabble Integrated Version

A two-player, local Arabic Scrabble game that runs entirely in the browser.

This project evolved from the original repository, [DAXEI08/update-version](https://github.com/DAXEI08/update-version), and merges its two Arabic tile-set variants into one shared game engine, with a selectable visual theme system on top.

> **One game engine, one ruleset, two tile sets, multiple visual themes.**

## Features

- Two-player local Arabic Scrabble on the classic 15×15 board
- **Expanded** and **Basic** tile modes (chosen when a game starts)
- Selectable visual themes, applied instantly and remembered on the device
- Per-player timer (the clock starts after the first move)
- Undo of the last move
- Tile swap
- **Unlimited pass**: there is no pass or skip limit
- Human **tahkim** (judging): the challenger rules the last move **✔ صحيح** or **✖ خطأ**
- Move history with words, scores, bingos, passes, swaps and tahkim verdicts in an optional off-canvas drawer
- Blank tiles (always worth 0)
- Four responsive layout presets for desktop, tablet and mobile, portrait and landscape
- Live interface tuning for board, racks, buttons, button spacing/columns and history sizing

There is no automatic dictionary: word validity is decided only by the players through tahkim.

## Modes

Both modes use the same engine, gameplay, board, scoring, timer, tahkim, UI, and features. **The only difference is the tile distribution and the blank-tile alphabet.**

| Mode | Arabic label | Tiles | Blank tile can become |
|---|---|---|---|
| Expanded | الحروف الموسعة | the 28 basic letters plus `أ إ آ ء ؤ ئ ة ى` (101 tiles incl. 2 blanks) | any of those 36 letters |
| Basic | الحروف الأساسية | the 28 basic letters only (84 tiles incl. 2 blanks) | only the 28 basic letters |

- The mode is picked at game setup: **PLAY → tile mode → duration → confirmation → game**. It cannot change while a game is running; **New game** goes back through mode selection.
- Tiles are never normalised (`أ` stays `أ`, `ة` stays `ة`, …). The letter `ه` is stored as plain `ه`; the `هـ` face on the tile is display-only (`FACE` in `config.js`).
- Both tile sets, their values and counts, and the blank alphabets live in `js/modes.js` as plain data. The engine just reads `TILE_MODES[app.mode]`.

## Themes

Themes only change presentation. They never affect the mode, tile distribution, scoring, timer, tahkim, board coordinates, placement, game state, history or dimensions. Choose one in **الإعدادات → المظهر**; it applies immediately without reloading and never resets the game.

| Theme | Arabic | Character |
|---|---|---|
| Classic | كلاسيكي | wood tones, cream tiles, dark green lettering (default) |
| Dark | داكن | charcoal panels, high-contrast light tiles, amber accents |
| Emerald | زمردي | emerald green, cream and gold |
| Desert | صحراوي | a light theme: sand, terracotta, warm brown, ivory, muted gold |

The selected theme is stored in `localStorage` under `scrabble.theme`. UI layout and sizing are stored together under `scrabble.ui`. Existing `scrabble.dims` data is migrated automatically into the unified UI settings. Resetting UI customization does not reset the theme or the game.

### How themes work

`js/themes.js` only sets `<html data-theme="id">`. All colours are CSS custom properties defined once per theme in `css/themes.css`; there is no per-element styling from JavaScript and no duplicated stylesheet. To add a theme, add a block in `themes.css` that defines every token, and an entry in `THEMES` in `themes.js`.

## Layout presets and UI configuration

Open **الإعدادات → تخطيط الواجهة** to switch layouts live without restarting the match.

| Preset | Arabic | Desktop intent | Mobile behavior |
|---|---|---|---|
| Balanced | متوازن | Large board with a flexible player/control side column | Standard board-first vertical flow |
| Arena | المواجهة | Players on opposite sides of the board; commands on the central axis below it | Controls are prioritized before the player panels |
| Board first | اللوح أولاً | Board → commands → two player panels side-by-side | Board → commands → players |
| Tabletop | الطاولة | One player above the board, the other below, commands beside it | Player 1 → board → commands → player 2 |

The presets rearrange the **same live DOM nodes**. They do not duplicate boards, racks, controls, timers or state, so changing layout cannot desynchronize gameplay.

The same settings panel exposes nine live adjustments: board scale, rack surface scale, tile scale, button scale, button spacing, number of control-button columns, history text scale, history drawer height, and history drawer width. Rack surface size and tile size are intentionally independent.

Layout and sizing are persisted as one `scrabble.ui` object. Invalid layout ids fall back to **Balanced**. Older `scrabble.dims` settings are migrated automatically.

## Word history

**سجل الكلمات** is deliberately secondary UI. It no longer owns a permanent grid column.

- It starts closed and never reserves board/layout space.
- On desktop and landscape it opens as a side drawer; on portrait phones it behaves like a bottom sheet.
- History keeps recording while closed and its trigger shows the live entry count.
- New moves never force the drawer open.
- It closes via its close button, Escape, or an interaction elsewhere in the game.
- The closed drawer is `inert` and `aria-hidden`; opening moves keyboard focus to its close button and closing restores focus to the trigger.

## Technology

HTML, CSS, vanilla JavaScript (ES Modules). No framework, no build step, no dependencies, no audio subsystem. Fonts (Amiri for Arabic, Tinos for Latin and digits) are bundled locally.

## Running

ES modules need to be served over HTTP (opening `index.html` from `file://` is blocked by browsers). From the project folder:

```sh
python3 -m http.server 8000
```

then open <http://localhost:8000>. Any static host (GitHub Pages, Netlify, …) works as-is.

## Folder structure

```
index.html
README.md

css/
  style.css       layout and components (colours come from theme tokens)
  cover.css       cover screen
  themes.css      theme palettes (CSS custom properties)

js/
  config.js       global constants: board size, durations, premium layout, glyph/label maps, dimension limits
  modes.js        Expanded and Basic tile data, blank alphabets, mode metadata
  themes.js       theme metadata, load/save/apply, theme selector
  histview.js     optional history drawer behavior and accessibility
  state.js        game state, tile bag, snapshots (undo / tahkim)
  game.js         turns, placement, submit, undo, swap, pass, game over
  scoring.js      word finding and scoring
  judge.js        tahkim
  ui.js           rendering and dialogs (including mode and duration selection, blank picker)
  input.js        click/tap, keyboard, drag and drop, buttons, dialog flow
  dims.js         unified layout preset + interface sizing settings
  cover.js        animated cover screen
  main.js         start-up

tests/            dev-only tests (not needed to play; see "Tests")
  package.json
  run-all.mjs     runs every suite below
  contrast.py     WCAG contrast and distinctness audit of css/themes.css
  logic/
    harness.mjs   loads the real modules in jsdom
    engine.mjs    modes, scoring, blanks, undo, tahkim, pass, themes, dimensions
    startup.mjs   real main.js start-up, cover, setup flow, Settings
  layout/
    lib.mjs       real-browser helpers (viewports, geometry, pixel checks)
    serve.mjs     tiny static server used by the tests
    baseline.mjs  regenerates baseline.json
    baseline.json layout measured before the history toggle existed
    history-toggle.mjs        drawer behavior and layout-stability checks
    history-toggle-extra.mjs  keyboard, themes, extreme dimensions
    desktop-fill.mjs          desktop viewport-utilization checks
    layout-presets.mjs        preset geometry, mobile compatibility, persistence and migration

assets/
  fonts/
    Amiri-Regular.woff2
    Amiri-Bold.woff2
    Tinos-Regular.woff2
    Tinos-Bold.woff2
```

## Tests

Dev-only; the game itself has no dependencies. From the `tests/` folder:

```sh
npm install
npm test          # all suites; or: node run-all.mjs "extra.mjs b" to run one
```

- `logic/*` run the real modules against jsdom.
- `layout/*` drive a real Chromium (the Linux build bundled with `@sparticuz/chromium`; set `CHROME_PATH` to use your own Chrome) and compare the bounding boxes of the racks, buttons, panels, board and history before and after toggling, in portrait and landscape phone, tablet and desktop viewports. Hidden state is also checked pixel-wise, with a positive control showing that visible history would be detected.
- `layout/baseline.json` is the layout of the app before the toggle existed. If you change the layout on purpose, regenerate it from the previous version (see the comment in `baseline.mjs`).

## Credits

By esbepe. Evolved from [DAXEI08/update-version](https://github.com/DAXEI08/update-version).
