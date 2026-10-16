# Kitten Planner — notes for Claude

Windows desktop app (single portable `.exe`): workspace for a founder opening a faux-leather
bookbinding workshop + souvenir shop in Coburg (Bavaria, Germany).

- **UI languages: Ukrainian (default) and German.** No Russian anywhere in the UI.
  Repo-facing text (README, comments, commits) is **English** — the repo is a public portfolio piece.
- Style: cute but neat — lavender / powder pink / cream / warm gray, soft shadows, rounded cards,
  light + dark theme. Buttons are chunky "pushable" (bottom edge) so the kitten can press them.

## Stack

- Electron; renderer is vanilla HTML/CSS + native ES modules, **no framework, no bundler**.
- Renderer deps are loaded straight from `node_modules` via relative paths
  (`three`, `marked`, `dompurify`, `@fontsource/nunito`). Keep `build.files` excludes in package.json
  in sync if you add heavy deps.
- Packaging: electron-builder `portable` target → `dist/KittenPlanner-<ver>-portable.exe`.

## Layout

- `src/main/main.js` — window, IPC, single-instance lock. `KITTEN_PLANNER_DATA_DIR` overrides userData (e2e).
  Chromium `--lang` follows the saved UI language; `enable-unsafe-swiftshader` keeps WebGL working without a GPU.
- `src/main/store.js` — `data.json` (atomic write + `data.backup.json`). **Add every new top-level field to
  `defaultData()`/`normalize()` here and in `src/renderer/js/schema.js`** (unit test keeps them identical).
- `src/main/secrets.js` — OpenAI key via `safeStorage`. Never put the key into `data.json` or the repo.
- `src/main/openai.js` — streaming chat; errors carry a `code` (`no_key`, `bad_key`, `rate_limit`, `model`, `http`,
  `network`) that the renderer translates (`chat.err.*`).
- `src/main/preload.js` — the only bridge (`window.api.*`). Renderer: sandbox, contextIsolation, CSP `connect-src`
  only `https://www.googleapis.com` (Drive sync).
- **Phone version** = the same renderer as a PWA on GitHub Pages: without Electron, `app.js` installs
  `js/platform/web.js` as `window.api` (IndexedDB, downloads, print-to-PDF, OAuth redirect). Any new `window.api`
  method needs both implementations. `scripts/build-web.js` → `site/` (vendor paths rewritten, web CSP, manifest,
  `sw.js` from `scripts/sw.template.js`); `.github/workflows/pages.yml` deploys it. Layout for phones lives in the
  `@media (max-width: 820px)` block of `styles.css` (sidebar becomes a drawer behind `#menu-toggle`).
- **Sync** (`js/sync/`): `drive.js` (appDataFolder client), `merge.js` (pure three-way merge; device-only settings
  in `DEVICE_SETTINGS`), `sync.js` (engine, status for the top-bar cloud and the Settings card). Desktop sign-in:
  `src/main/google.js` (loopback + PKCE, refresh token via safeStorage). Client ids come from
  `src/google-config.json`, filled from GitHub secrets by `scripts/google-config.js` — never commit real values.
  Setup guide: `docs/google-sync.md`.
- `src/renderer/js/i18n.js` — `t(key, params)`, `tx({uk, de})` for content objects, `money()`.
  Strings live in `locales/uk.js` + `locales/de.js` (unit test enforces same keys + every static `t('…')` key exists;
  e2e fails on any `i18n missing` console warning, which covers template keys).
- `src/renderer/js/state.js` — single `state.data`; `update(fn, { silent })` → debounced save (+ re-render unless silent).
  Use `silent: true` while the user types so the view is not re-rendered under the cursor.
- `src/renderer/js/app-shell.js` — sidebar nav groups, top-right UA/DE + theme switches, `applyLang/applyTheme`.
- `src/renderer/js/data/launch-*.js` — roadmap content (`{uk, de}` objects). `launch-model.js` merges with
  user-added steps; per-step state is `data.launch[kind][stepId] = { status, note, due, checks }`.
- `src/renderer/js/calc.js` — pure price calculation (unit-tested). `invoice-template.js` — German invoice HTML
  (always German, §14 UStG / §19 note) rendered to PDF by main (`pdf:save`).
- Documents are copied to `userData/documents/<random>_<name>`; main validates names (no path traversal).
- AI tab: `gpt-host.js` keeps one `<webview>` (partition `persist:chatgpt`, hosts allow-listed in main.js) laid over
  a placeholder; API mode uses `openai.js`. `playground.js` + `robot3d.js` = robot Auerilus playing tag with the kitten.
- Painting of the day: `data/art/part-*.js` entries `{ id, wiki, a, y, t, s, m, l, d }` (`wiki` = English Wikipedia
  title, image resolved by `scripts/fetch-art.js` in CI and bundled to `assets/art/<id>.jpg`, gitignored), `pins.js`
  (date → id), `index.js` schedule START..END. Unit test enforces one unique painting per day. **No Russian artists.**
- Pet corner (sidebar bottom): `pets.js` (persistent element, ~30 fps loop) + `pets3d.js` (one WebGL scene: two cats
  built with `buildCat()` from `kitten3d.js` and a corgi). Keep WebGL contexts few — the robot view is created once and reused.
- Seasons (`js/seasons/`): `season.js` (pure: date → season, effects per season, pub/sub for outfits), `index.js`
  (applies `html[data-season]`, effects, sound), `fx.js` (canvas behind the UI + SVG decor), `sound.js` (WebAudio),
  `birthday.js` (3 Nov card). Palettes in `css/seasons.css`; 3D hats in `outfits.js` (`setOutfit` on each view).
  Season/effect/sound settings are device-only (`DEVICE_SETTINGS`). Painting quiz: `views/quiz.js`.
- Kitten: `kitten.js` (behaviour state machine: follow / approach / crouch / jump / perched; sleep & purr),
  `kitten3d.js` (three.js toon cat, poses lerped per frame), `kitten-svg.js` (fallback). It must never block clicks
  (`pointer-events: none`). Buttons it lands on get `.kitten-perch` / `.kitten-press` (they use the
  `translate` property so they don't fight `transform`).

## Commands

- `npm start` / `npm run dev`
- `npm run check` — eslint + prettier check + unit tests
- `xvfb-run -a npx playwright test` — e2e on the real app + `test/e2e/web.spec.js` (phone build, iPhone viewport, fake Drive); `SCREENSHOT_DIR=/dir` saves screenshots — **look at them
  after UI changes** (both languages, both themes).
- `npm run icons` — regenerate icons from `build/icon.svg`.
- Windows `.exe`: GitHub Actions `windows-latest` (artifact `KittenPlanner-windows`; tag `v*` or a manual run with `release: true` → GitHub Release `v<package.json version>`).
  Local Linux sanity build without wine: `npx electron-builder --win portable --x64 -c.win.signAndEditExecutable=false`.

## Conventions

- Prettier (single quotes, width 120). Dates are local `YYYY-MM-DD` strings; money in euros as numbers.
- In e2e selectors scope `has-text` to a container — plain `text=` matches substrings in subtitles.
