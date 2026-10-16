// Phone/web version: builds site/, serves it locally and drives it in a phone-sized Chromium.
// Google Drive is replaced by an in-memory fake, so the sync round trip is tested end to end.
const { test, expect, devices } = require('@playwright/test');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.join(__dirname, '..', '..');
const site = path.join(root, 'site');
const shots = process.env.SCREENSHOT_DIR;
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2',
};

let server;
let base;

// Prefer a preinstalled Chromium (CHROMIUM_PATH or the sandbox's /opt/pw-browsers) over a download.
const systemChromium = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium';
test.use({
  ...devices['iPhone 13'],
  browserName: 'chromium',
  launchOptions: fs.existsSync(systemChromium) ? { executablePath: systemChromium } : {},
});

test.beforeAll(async () => {
  execFileSync(process.execPath, [path.join(root, 'scripts', 'build-web.js')], {
    env: { ...process.env, GOOGLE_WEB_CLIENT_ID: 'test-client.apps.googleusercontent.com' },
  });
  server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    let file = path.join(site, decodeURIComponent(url.pathname));
    if (file.endsWith(path.sep)) file = path.join(file, 'index.html');
    if (!file.startsWith(site) || !fs.existsSync(file)) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    res.end(fs.readFileSync(file));
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}/`;
});

test.afterAll(() => server?.close());

/** In-memory Google Drive appDataFolder behind page.route. */
function fakeDrive() {
  const files = new Map(); // id -> { name, body }
  let next = 1;
  const handler = async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const method = req.method();
    if (url.pathname === '/drive/v3/files' && method === 'GET') {
      const name = /name = '([^']+)'/.exec(url.searchParams.get('q') || '')?.[1];
      const found = [...files].filter(([, f]) => f.name === name).map(([id]) => ({ id, version: '1' }));
      return route.fulfill({ json: { files: found } });
    }
    if (url.pathname === '/upload/drive/v3/files' && method === 'POST') {
      const raw = req.postDataBuffer().toString('utf8');
      const boundary = /boundary=(\S+)/.exec(req.headers()['content-type'])[1];
      const parts = raw.split(`--${boundary}`);
      const meta = JSON.parse(parts[1].split('\r\n\r\n')[1]);
      const body = parts[2].split('\r\n\r\n').slice(1).join('\r\n\r\n').replace(/\r\n$/, '');
      const id = `f${next++}`;
      files.set(id, { name: meta.name, body });
      return route.fulfill({ json: { id, version: '1' } });
    }
    const upd = /^\/upload\/drive\/v3\/files\/(\w+)$/.exec(url.pathname);
    if (upd && method === 'PATCH') {
      files.get(upd[1]).body = req.postDataBuffer().toString('utf8');
      return route.fulfill({ json: { id: upd[1], version: '2' } });
    }
    const get = /^\/drive\/v3\/files\/(\w+)$/.exec(url.pathname);
    if (get && method === 'GET') return route.fulfill({ body: files.get(get[1]).body });
    if (get && method === 'DELETE') {
      files.delete(get[1]);
      return route.fulfill({ status: 204 });
    }
    return route.fulfill({ status: 500, body: `unexpected ${method} ${url.pathname}` });
  };
  const data = () => {
    const f = [...files.values()].find((x) => x.name === 'kitten-planner-data.json');
    return f ? JSON.parse(f.body) : null;
  };
  const setData = (value) => {
    const f = [...files.values()].find((x) => x.name === 'kitten-planner-data.json');
    f.body = JSON.stringify(value);
  };
  return { handler, data, setData };
}

function watchProblems(page) {
  const problems = [];
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error' || m.text().startsWith('i18n missing')) problems.push(`${m.type()}: ${m.text()}`);
  });
  return problems;
}

test('phone: drawer navigation, notes persist offline in the app', async ({ page }) => {
  const problems = watchProblems(page);
  await page.goto(base);
  await page.waitForSelector('body.ready');
  await expect(page.locator('#greeting')).toBeVisible();
  await expect(page.locator('#menu-toggle')).toBeVisible();
  await expect(page.locator('#nav')).not.toBeInViewport();
  if (shots) await page.screenshot({ path: path.join(shots, 'web-01-home.png') });

  await page.click('#menu-toggle');
  await expect(page.locator('#nav')).toBeInViewport();
  await page.waitForTimeout(400);
  if (shots) await page.screenshot({ path: path.join(shots, 'web-02-drawer.png') });
  await page.click('[data-view="notes"]');
  await expect(page.locator('#nav')).not.toBeInViewport();
  await page.click('.page-head button:has-text("Нова нотатка")');
  await page.fill('.note-title-input', 'Ідея з телефона');
  await page.waitForTimeout(800);
  await page.reload();
  await page.waitForSelector('body.ready');
  await page.click('#menu-toggle');
  await page.click('[data-view="notes"]');
  await expect(page.locator('.note-item')).toContainText('Ідея з телефона');
  if (shots) await page.screenshot({ path: path.join(shots, 'web-03-notes.png') });
  expect(problems).toEqual([]);
});

test('phone: syncs with Google Drive both ways', async ({ page }) => {
  const problems = watchProblems(page);
  const drive = fakeDrive();
  await page.route('https://www.googleapis.com/**', drive.handler);
  await page.addInitScript(() => {
    localStorage.setItem(
      'kp-google',
      JSON.stringify({ connected: true, token: 'test-token', exp: Date.now() + 3600e3, email: 'olena@example.com' }),
    );
  });
  await page.goto(base);
  await page.waitForSelector('body.ready');
  // Local data goes up on the first sync.
  await expect(page.locator('#sync-toggle')).toHaveAttribute('data-state', 'ok');
  await page.click('#menu-toggle');
  await page.click('[data-view="settings"]');
  await page.fill('.settings-grid input.input >> nth=0', 'Olena');
  await expect.poll(() => drive.data()?.profile?.name, { timeout: 15000 }).toBe('Olena');
  expect(drive.data().settings.theme).toBeUndefined(); // look & feel stays per device

  // A note written on the computer arrives on the phone.
  const remote = drive.data();
  remote.notes.push({ id: 'desk1', title: 'З комп’ютера', body: '', color: 'cream', updatedAt: Date.now() });
  drive.setData(remote);
  await page.click('#sync-toggle');
  await page.click('#menu-toggle');
  await page.click('[data-view="notes"]');
  await expect(page.locator('.note-item')).toContainText('З комп’ютера');
  await page.click('#menu-toggle');
  await page.click('[data-view="settings"]');
  await expect(page.locator('#sync')).toContainText('olena@example.com');
  await page.locator('#sync').scrollIntoViewIfNeeded();
  if (shots) await page.screenshot({ path: path.join(shots, 'web-04-sync.png') });
  expect(problems).toEqual([]);
});

test('phone: dark theme in German, painting of the day, AI tab', async ({ page }) => {
  const problems = watchProblems(page);
  await page.goto(base);
  await page.waitForSelector('body.ready');
  await page.click('.lang-switch button[data-lang="de"]');
  await page.click('#theme-toggle');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.click('.page-head button:has-text("🎨")');
  await expect(page.locator('.art-modal .art-title')).not.toBeEmpty();
  if (shots) await page.screenshot({ path: path.join(shots, 'web-05-art-de-dark.png') });
  await page.keyboard.press('Escape');
  await page.click('#menu-toggle');
  await page.click('[data-view="chat"]');
  await expect(page.locator('.gpt-web')).toBeVisible();
  await expect(page.locator('#robot')).toBeVisible();
  await page.waitForTimeout(1200);
  if (shots) await page.screenshot({ path: path.join(shots, 'web-06-ai-de-dark.png') });
  expect(problems).toEqual([]);
});
