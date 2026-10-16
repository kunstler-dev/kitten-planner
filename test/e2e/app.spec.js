// Launches the real Electron app and clicks through every section.
const { test, expect, _electron: electron } = require('@playwright/test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const shots = process.env.SCREENSHOT_DIR;
const snap = async (page, name) => {
  if (shots) await page.screenshot({ path: path.join(shots, `${name}.png`) });
};

let app;
let page;
let dataDir;
const problems = [];
let current = '';
// eslint-disable-next-line no-empty-pattern -- Playwright requires a destructured fixtures argument
test.beforeEach(({}, info) => {
  current = info.title;
});

test.beforeAll(async () => {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kp-e2e-'));
  app = await electron.launch({
    args: ['.', ...(process.env.CI || process.getuid?.() === 0 ? ['--no-sandbox'] : [])],
    cwd: path.join(__dirname, '..', '..'),
    env: { ...process.env, KITTEN_PLANNER_DATA_DIR: dataDir },
  });
  page = await app.firstWindow();
  page.on('pageerror', (e) => problems.push(`[${current}] pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error' || m.text().startsWith('i18n missing'))
      problems.push(`[${current}] ${m.type()}: ${m.text()}`);
  });
  await page.setViewportSize({ width: 1360, height: 860 });
  await page.waitForSelector('body.ready');
});

test.afterAll(async () => {
  await app?.close();
});

const go = (view) => page.click(`[data-view="${view}"]`);
const headBtn = (text) => page.click(`.page-head button:has-text("${text}")`);

test('home renders in Ukrainian with the 3D kitten', async () => {
  await expect(page.locator('html')).toHaveAttribute('lang', 'uk');
  await expect(page.locator('[data-view="workshop"]')).toContainText('Майстерня');
  await expect(page.locator('#kitten')).toBeVisible();
  await expect(page.locator('#kitten')).toHaveAttribute('data-renderer', '3d');
  await page.mouse.move(700, 420);
  await page.waitForTimeout(900);
  await snap(page, '01-home');
});

test('legal launch roadmap: complete the first step', async () => {
  await go('legal');
  await expect(page.locator('.step')).toHaveCount(23);
  const first = page.locator('.step').first();
  await expect(first).toHaveClass(/next/);
  await first.locator('.step-check input').first().check();
  await first.locator('.segmented button', { hasText: 'Готово' }).click();
  await expect(page.locator('.launch-summary-title')).toContainText('1 з');
  await expect(page.locator('.step').nth(1)).toHaveClass(/next/);
  await snap(page, '02-legal');
});

test('commercial launch roadmap', async () => {
  await go('commercial');
  await expect(page.locator('.phase')).toHaveCount(6);
  await page.locator('.step').nth(3).locator('.step-title-btn').click();
  await expect(page.locator('.step').nth(3).locator('.step-desc')).toContainText('Spitalgasse');
  await snap(page, '03-commercial');
});

test('workshop: configure a notebook and save it to the catalog', async () => {
  await go('workshop');
  await page.click('.leather-swatch >> nth=2');
  await page.locator('.extra-chip', { hasText: 'Тиснення' }).click();
  await page.fill('.cfg-options input[maxlength="24"]', 'Coburg');
  await page.locator('.cfg-options input[maxlength="24"]').press('Tab');
  await expect(page.locator('.nb-emboss')).toHaveText('Coburg');
  await expect(page.locator('.price-big')).toContainText('€');
  await snap(page, '04-workshop');
  await page.click('.cfg-result button.btn-primary');
  await page.click('.modal .btn-primary');
  await expect(page.locator('.product-card')).toHaveCount(1);
  await snap(page, '05-catalog');
});

test('finance: entries, invoice paid → income', async () => {
  await go('finance');
  await page.locator('.page-head .segmented button', { hasText: 'Записи' }).click();
  await page.locator('.toolbar button', { hasText: 'Витрата' }).click();
  await page.fill('.modal input[placeholder^="Напр"]', 'Штучна шкіра 5 м');
  await page.fill('.modal input[type="number"]', '89.5');
  await page.click('.modal .btn-primary');
  await expect(page.locator('.data-table tbody tr')).toHaveCount(1);

  await page.locator('.page-head .segmented button', { hasText: 'Рахунки' }).click();
  await page.locator('.toolbar button', { hasText: 'Новий рахунок' }).click();
  await page.fill('.modal input[placeholder="Імʼя або фірма"]', 'Hotel Goldene Traube');
  await page.fill('.modal .inv-item:not(.head) input >> nth=0', 'Gästebuch A4, Kunstleder');
  await page.fill('.modal .inv-item:not(.head) input >> nth=2', '79');
  await expect(page.locator('.inv-totals .grand')).toContainText('79');
  await page.locator('.modal .modal-actions .btn-primary').click();
  await expect(page.locator('.data-table tbody tr')).toHaveCount(1);
  await page.selectOption('.status-select', 'paid');
  await page.locator('.page-head .segmented button', { hasText: 'Огляд' }).click();
  await expect(page.locator('.stat-value').first()).toContainText('79');
  await snap(page, '06-finance');
});

test('documents: add a record with deadline', async () => {
  await go('documents');
  await headBtn('Додати документ');
  await page.fill('.modal input.input >> nth=0', 'Fragebogen zur steuerlichen Erfassung');
  await page.fill('.modal input[type="date"] >> nth=1', '2030-01-15');
  await page.click('.modal .modal-actions .btn-primary');
  await expect(page.locator('.doc-card')).toHaveCount(1);
  await snap(page, '07-documents');
});

test('plans and tasks', async () => {
  await go('plans');
  await headBtn('Новий план');
  await page.fill('.modal input.input', 'Колекція до Різдва');
  await page.click('.modal .modal-actions .btn-primary');
  await page.locator('.quick-add input').fill('Зразки обкладинок');
  await page.locator('.quick-add input').press('Enter');
  await page.locator('.quick-add input').fill('Фото для Instagram');
  await page.locator('.quick-add input').press('Enter');
  await expect(page.locator('.task-row')).toHaveCount(2);
  await page.locator('.task-row .check').first().click();
  await expect(page.locator('.plan-progress-row')).toContainText('1 з 2');
});

test('notes and calendar', async () => {
  await go('notes');
  await headBtn('Нова нотатка');
  await page.fill('.note-title-input', 'Ідеї для бренду');
  await page.fill('.note-body-input', 'Лаванда, крафт, тиснення золотом.');
  await expect(page.locator('.note-item')).toHaveCount(1);
  await go('calendar');
  await headBtn('Подія');
  await page.fill('.modal input.input >> nth=0', 'Огляд приміщення, Spitalgasse');
  await page.fill('.modal input[type="time"] >> nth=0', '14:30');
  await page.click('.modal .modal-actions .btn-primary');
  await expect(page.locator('.cal-pill').first()).toContainText('Огляд');
  await snap(page, '08-calendar');
});

test('calendar easter egg opens the painting of the day', async () => {
  await go('home');
  await page.click('.page-head button:has-text("🎨")');
  await expect(page.locator('.art-modal .art-title')).not.toBeEmpty();
  await expect(page.locator('.art-modal .art-text').first()).not.toBeEmpty();
  await page.waitForTimeout(800);
  await snap(page, '08b-art');
  await page.keyboard.press('Escape');
  await expect(page.locator('.art-modal')).toHaveCount(0);
});

test('AI tab: ChatGPT account mode with Auerilus, API mode asks for the key', async () => {
  await go('chat');
  await expect(page.locator('.gpt-frame')).toBeVisible();
  await expect(page.locator('#robot')).toBeVisible();
  await page.waitForTimeout(1500);
  await snap(page, '08c-chat-account');
  await page.click('.page-head .segmented button >> nth=1');
  await expect(page.locator('.key-setup')).toBeVisible();
  await expect(page.locator('#robot')).toBeVisible();
  await page.click('.page-head .segmented button >> nth=0');
  await expect(page.locator('.gpt-frame')).toBeVisible();
});

test('switch to German and dark theme from the top bar', async () => {
  await page.click('.lang-switch button[data-lang="de"]');
  await expect(page.locator('[data-view="workshop"]')).toContainText('Werkstatt');
  await expect(page.locator('html')).toHaveAttribute('lang', 'de');
  await page.click('#theme-toggle');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await go('legal');
  await expect(page.locator('.step').first()).toContainText('Selbstständigkeit');
  await page.mouse.move(800, 500);
  await page.waitForTimeout(600);
  await snap(page, '09-legal-de-dark');
  await go('workshop');
  await page.waitForTimeout(300);
  await snap(page, '10-workshop-de-dark');
});

test('kitten jumps onto a button the user hovers', async () => {
  await go('home');
  const box = await page.locator('[data-view="finance"]').boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 8 });
  await page.waitForFunction(() => document.querySelector('.kitten-perch'), null, { timeout: 15000 });
  await snap(page, '11-kitten-perch');
});

test('everything was saved to disk and no errors occurred', async () => {
  await go('settings');
  await page.fill('.settings-grid input.input >> nth=0', 'Olena');
  await page.waitForTimeout(800);
  await snap(page, '12-settings');
  const saved = JSON.parse(fs.readFileSync(path.join(dataDir, 'data.json'), 'utf8'));
  expect(saved.profile.name).toBe('Olena');
  expect(saved.settings.lang).toBe('de');
  expect(saved.settings.theme).toBe('dark');
  expect(Object.values(saved.launch.legal).some((s) => s.status === 'done')).toBe(true);
  expect(saved.products).toHaveLength(1);
  expect(saved.transactions.map((x) => x.type).sort()).toEqual(['expense', 'income']);
  expect(saved.invoices[0].status).toBe('paid');
  expect(saved.documents[0].deadline).toBe('2030-01-15');
  expect(saved.notes[0].title).toBe('Ідеї для бренду');
  expect(saved.events[0].time).toBe('14:30');
  expect(problems).toEqual([]);
});
