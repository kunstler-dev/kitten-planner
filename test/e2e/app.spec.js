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

test.beforeAll(async () => {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kp-e2e-'));
  app = await electron.launch({
    args: ['.', ...(process.env.CI || process.getuid?.() === 0 ? ['--no-sandbox'] : [])],
    cwd: path.join(__dirname, '..', '..'),
    env: { ...process.env, KITTEN_PLANNER_DATA_DIR: dataDir },
  });
  page = await app.firstWindow();
  await page.setViewportSize({ width: 1320, height: 840 });
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
  await page.waitForSelector('body.ready');
});

test.afterAll(async () => {
  await app?.close();
});

test('home renders with kitten', async () => {
  await expect(page.locator('h1')).toContainText(/Доброе|Добрый|Доброй/);
  await expect(page.locator('#kitten')).toBeVisible();
  await page.mouse.move(600, 400);
  await page.waitForTimeout(800);
  await snap(page, '01-home');
});

test('tasks and plans', async () => {
  await page.click('[data-view="tasks"]');
  await page.click('.page-head button:has-text("Новый план")');
  await page.fill('.modal input.input', 'Запуск своего дела');
  await page.click('.modal >> text=Создать план');
  const quick = page.locator('.quick-add input');
  await quick.fill('Зарегистрировать ИП');
  await quick.press('Enter');
  await page.locator('.quick-add input').fill('Сделать логотип');
  await page.locator('.quick-add input').press('Enter');
  await expect(page.locator('.task-row')).toHaveCount(2);
  await page.locator('.task-row .check').first().click();
  await expect(page.locator('.plan-progress-row')).toContainText('1 из 2');
  await snap(page, '02-tasks');
});

test('notes create and persist', async () => {
  await page.click('[data-view="notes"]');
  await page.click('.page-head button:has-text("Новая заметка")');
  await page.fill('.note-title-input', 'Идеи для бренда');
  await page.fill('.note-body-input', 'Мягкие цвета, котики, уют.');
  await expect(page.locator('.note-item')).toHaveCount(1);
  await snap(page, '03-notes');
});

test('calendar event', async () => {
  await page.click('[data-view="calendar"]');
  await page.click('.page-head button:has-text("Событие")');
  await page.fill('.modal input.input >> nth=0', 'Встреча с бухгалтером');
  await page.fill('.modal input[type="time"] >> nth=0', '14:30');
  await page.click('.modal >> text=Добавить');
  await expect(page.locator('.cal-pill')).toContainText('Встреча');
  await snap(page, '04-calendar');
});

test('chat asks for key', async () => {
  await page.click('[data-view="chat"]');
  await expect(page.locator('.key-setup')).toBeVisible();
  await snap(page, '05-chat');
});

test('settings and data saved to disk', async () => {
  await page.click('[data-view="settings"]');
  await page.fill('.settings-grid input.input >> nth=0', 'Анна');
  await page.waitForTimeout(800);
  await snap(page, '06-settings');
  const saved = JSON.parse(fs.readFileSync(path.join(dataDir, 'data.json'), 'utf8'));
  expect(saved.profile.name).toBe('Анна');
  expect(saved.notes[0].title).toBe('Идеи для бренда');
  expect(saved.tasks).toHaveLength(2);
  expect(saved.events[0].time).toBe('14:30');
  expect(saved.plans[0].title).toBe('Запуск своего дела');
});

test('kitten plays with an element when the mouse rests', async () => {
  await page.click('[data-view="home"]');
  await page.mouse.move(700, 300);
  // Force the next play attempt immediately.
  await page.evaluate(() => {
    window.__kpForcePlay = true;
  });
  const bumped = await page.waitForFunction(() => document.querySelector('.kitten-bump'), null, { timeout: 30000 });
  expect(bumped).toBeTruthy();
  await snap(page, '07-kitten-play');
});
