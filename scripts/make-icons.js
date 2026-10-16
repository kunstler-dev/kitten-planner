// Renders build/icon.svg into PNG/ICO files using Playwright's Chromium.
// Requires ImageMagick (`convert`) for the multi-size .ico.
const { chromium } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

(async () => {
  const root = path.join(__dirname, '..');
  const svg = fs.readFileSync(path.join(root, 'build', 'icon.svg'), 'utf8');
  const sys = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium';
  const browser = await chromium.launch(fs.existsSync(sys) ? { executablePath: sys } : {});
  const page = await browser.newPage({ viewport: { width: 256, height: 256 } });
  await page.setContent(
    `<html><body style="margin:0;background:transparent">${svg.replace('width="256" height="256"', 'width="256" height="256" style="display:block"')}</body></html>`,
  );
  const png = path.join(root, 'build', 'icon.png');
  await page.screenshot({ path: png, omitBackground: true });

  // Phone home-screen icons: full-bleed square (iOS rounds the corners itself).
  const square = svg.replace(
    /<rect x="8" y="8" width="240" height="240" rx="60"/,
    '<rect x="0" y="0" width="256" height="256"',
  );
  const iconsDir = path.join(root, 'src', 'renderer', 'assets', 'icons');
  fs.mkdirSync(iconsDir, { recursive: true });
  for (const [name, size] of [
    ['apple-touch-icon.png', 180],
    ['icon-192.png', 192],
    ['icon-512.png', 512],
  ]) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(
      `<html><body style="margin:0">${square.replace('width="256" height="256"', `width="${size}" height="${size}" style="display:block"`)}</body></html>`,
    );
    await page.screenshot({ path: path.join(iconsDir, name) });
  }
  await browser.close();
  fs.mkdirSync(path.join(root, 'src', 'renderer', 'assets'), { recursive: true });
  fs.copyFileSync(png, path.join(root, 'src', 'renderer', 'assets', 'icon.png'));
  execFileSync('convert', [
    png,
    '-define',
    'icon:auto-resize=256,128,64,48,32,24,16',
    path.join(root, 'build', 'icon.ico'),
  ]);
  console.log('icons written');
})();
