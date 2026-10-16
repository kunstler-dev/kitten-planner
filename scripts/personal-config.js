// Writes src/renderer/js/personal.js from the PERSONAL_CONFIG environment variable (a GitHub
// Actions secret holding JSON: { "birthday": "MM-DD", "title": {uk, de}, "love": {uk, de} }).
// Without the variable the committed neutral placeholders stay.
const fs = require('node:fs');
const path = require('node:path');

const raw = process.env.PERSONAL_CONFIG;
if (!raw) {
  console.log('personal.js: PERSONAL_CONFIG not set, keeping placeholders');
  process.exit(0);
}
const cfg = JSON.parse(raw);
const text = (v) => (v && typeof v.uk === 'string' && typeof v.de === 'string' ? { uk: v.uk, de: v.de } : null);
const birthday = /^\d{2}-\d{2}$/.test(cfg.birthday || '') ? cfg.birthday : '';
const personal = { birthday, title: text(cfg.title), love: text(cfg.love) };

const file = path.join(__dirname, '..', 'src', 'renderer', 'js', 'personal.js');
const src = fs.readFileSync(file, 'utf8');
const head = src.slice(0, src.indexOf('export const PERSONAL'));
fs.writeFileSync(file, `${head}export const PERSONAL = ${JSON.stringify(personal, null, 2)};\n`);
console.log(
  `personal.js: birthday ${birthday ? 'set' : 'empty'}, title ${personal.title ? 'set' : 'generic'}, love ${personal.love ? 'set' : 'none'}`,
);
