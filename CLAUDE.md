# Kitten Planner — notes for Claude

Windows desktop app (single portable `.exe`): personal work dashboard for a woman starting her own business.
UI language is **Russian**. Style: cute but neat — lavender / powder pink / cream / warm gray, soft shadows, rounded cards.

## Stack

- Electron (main: `src/main`, renderer: `src/renderer`), plain HTML/CSS + native ES modules, **no bundler, no framework**.
- Renderer deps loaded straight from `node_modules` via relative paths (`marked`, `dompurify`, `@fontsource/nunito`).
- Packaging: `electron-builder` → `portable` target (`dist/KittenPlanner-<ver>-portable.exe`).

## Layout

- `src/main/main.js` — window, IPC handlers, single-instance lock. `KITTEN_PLANNER_DATA_DIR` env overrides userData (used by e2e).
- `src/main/store.js` — JSON store in userData (`data.json`, atomic write + `data.backup.json`). `normalize()` merges with defaults — add new fields there.
- `src/main/secrets.js` — OpenAI key, encrypted with `safeStorage` (DPAPI). Never put the key in `data.json` or the repo (**repo is public**).
- `src/main/openai.js` — streaming Chat Completions (SSE) from the main process; renderer gets `chat:delta/done/error` events.
- `src/main/preload.js` — the only bridge: `window.api.*`. Renderer is sandboxed, contextIsolation on, strict CSP (`connect-src 'none'`).
- `src/renderer/js/state.js` — single `state.data`, `update(fn, {silent})` → debounced save + rerender of the current view.
  Use `silent: true` while typing (notes editor, settings inputs) so the view is not re-rendered under the cursor.
- `src/renderer/js/views/*` — one `renderX(root, params)` per section; `router.js` for navigation.
- `src/renderer/js/kitten.js` + `css/kitten.css` — the kitten (SVG, rAF loop, states `idle/run/jump/happy/sleep`, plays with `.card/.btn/...` via `.kitten-bump`). `pointer-events: none` — it must never block clicks.

## Commands

- `npm start` / `npm run dev` (devtools)
- `npm run check` — eslint + prettier check + unit tests (`node --test`)
- `xvfb-run -a npx playwright test` — e2e: launches real Electron, clicks every section. `SCREENSHOT_DIR=/some/dir` saves screenshots — look at them after UI changes.
- `npm run icons` — regenerate `build/icon.{png,ico}` + `src/renderer/assets/icon.png` from `build/icon.svg`.
- Windows exe: built by GitHub Actions on `windows-latest` (`.github/workflows/build.yml`, artifact `KittenPlanner-windows`; tag `v*` → GitHub Release).
  Local Linux check without wine: `npx electron-builder --win portable --x64 -c.win.signAndEditExecutable=false` (exe has no custom icon metadata).

## Conventions

- Prettier (single quotes, width 120). Run `npm run format` before committing.
- Dates stored as local `YYYY-MM-DD` strings (`dates.js`); timestamps as ms numbers.
- In e2e selectors prefer `button:has-text("…")` scoped to a container — `text=` does substring matching and hits subtitles.
