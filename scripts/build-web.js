// Builds the phone/web version into site/ for GitHub Pages: the same renderer as the desktop app,
// with vendor files copied next to it, a web CSP, a manifest + service worker (installable on the
// iPhone home screen, works offline) and the public Google web client id.
// Usage: node scripts/build-web.js   (run scripts/fetch-art.js first to include painting images)
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.join(__dirname, '..');
const src = path.join(root, 'src', 'renderer');
const out = path.join(root, 'site');
const pkg = require('../package.json');

const VENDOR = [
  'three/build/three.module.js',
  'three/build/three.core.js',
  'marked/lib/marked.umd.js',
  'dompurify/dist/purify.min.js',
  ...['cyrillic', 'latin'].flatMap((s) =>
    [400, 600, 700, 800].map((w) => `@fontsource/nunito/files/nunito-${s}-${w}-normal.woff2`),
  ),
];

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self' https://www.googleapis.com https://oauth2.googleapis.com https://api.openai.com",
  "frame-src 'self' blob:",
].join('; ');

const HEAD_EXTRA = `
    <link rel="icon" href="assets/icons/icon-192.png" />
    <link rel="manifest" href="manifest.webmanifest" />
    <meta name="theme-color" content="#f8f5f2" />
    <link rel="apple-touch-icon" href="assets/icons/apple-touch-icon.png" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="apple-mobile-web-app-title" content="Kitten Planner" />`;

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const a = path.join(from, entry.name);
    const b = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(a, b);
    else fs.copyFileSync(a, b);
  }
}

function listFiles(dir, base = dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? listFiles(p, base) : [path.relative(base, p).split(path.sep).join('/')];
  });
}

function rewrite(file, from, to) {
  const p = path.join(out, file);
  fs.writeFileSync(p, fs.readFileSync(p, 'utf8').split(from).join(to));
}

fs.rmSync(out, { recursive: true, force: true });
copyDir(src, out);
for (const rel of VENDOR) {
  const dest = path.join(out, 'vendor', rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(path.join(root, 'node_modules', rel), dest);
}

rewrite('css/fonts.css', '../../../node_modules/', '../vendor/');
rewrite('js/three-stage.js', '../../../node_modules/', '../vendor/');
let html = fs.readFileSync(path.join(out, 'index.html'), 'utf8');
html = html
  .split('../../node_modules/')
  .join('vendor/')
  .replace(/content="default-src[^"]*"/, `content="${CSP}"`)
  .replace('<html lang="uk">', `<html lang="uk" data-version="${pkg.version}">`)
  .replace('</title>', `</title>${HEAD_EXTRA}`);
fs.writeFileSync(path.join(out, 'index.html'), html);

fs.writeFileSync(
  path.join(out, 'manifest.webmanifest'),
  JSON.stringify(
    {
      name: 'Kitten Planner',
      short_name: 'Kitten Planner',
      description: 'Робочий простір для майстерні та крамнички в Кобурзі',
      lang: 'uk',
      start_url: './',
      scope: './',
      display: 'standalone',
      background_color: '#f8f5f2',
      theme_color: '#f8f5f2',
      icons: [
        { src: 'assets/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: 'assets/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
      ],
    },
    null,
    2,
  ),
);

// Which paintings have a bundled image (the app asks this list instead of probing for 404s).
const artDir = path.join(out, 'assets', 'art');
const artIds = fs.existsSync(artDir)
  ? fs
      .readdirSync(artDir)
      .filter((f) => f.endsWith('.jpg'))
      .map((f) => f.slice(0, -4))
  : [];
fs.mkdirSync(path.join(out, 'assets'), { recursive: true });
fs.writeFileSync(path.join(out, 'assets', 'art-index.json'), JSON.stringify(artIds));

// Only the web client id is public; the desktop secret never goes to the site.
fs.writeFileSync(
  path.join(out, 'google-config.json'),
  JSON.stringify({ webClientId: process.env.GOOGLE_WEB_CLIENT_ID || readLocalConfig().webClientId || '' }),
);

// Service worker: the app shell is precached (offline start); paintings are cached when first viewed.
const shell = listFiles(out).filter((f) => !f.startsWith('assets/art/') && f !== 'google-config.json');
const version = crypto
  .createHash('sha256')
  .update(shell.map((f) => fs.readFileSync(path.join(out, f))).join(''))
  .digest('hex')
  .slice(0, 12);
const sw = fs
  .readFileSync(path.join(__dirname, 'sw.template.js'), 'utf8')
  .replace('__VERSION__', version)
  .replace('__SHELL__', JSON.stringify(['./', ...shell]));
fs.writeFileSync(path.join(out, 'sw.js'), sw);
fs.writeFileSync(path.join(out, '.nojekyll'), '');

console.log(`site/ built: ${shell.length} app files, cache ${version}`);

function readLocalConfig() {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, 'src', 'google-config.json'), 'utf8'));
  } catch {
    return {};
  }
}
