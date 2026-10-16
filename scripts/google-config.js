// Writes src/google-config.json from the GOOGLE_* environment variables (GitHub Actions secrets),
// so the OAuth client ids never have to be committed. Missing values keep the file's current ones.
const fs = require('node:fs');
const path = require('node:path');

const file = path.join(__dirname, '..', 'src', 'google-config.json');
const current = JSON.parse(fs.readFileSync(file, 'utf8'));
const next = {
  webClientId: process.env.GOOGLE_WEB_CLIENT_ID || current.webClientId || '',
  desktopClientId: process.env.GOOGLE_DESKTOP_CLIENT_ID || current.desktopClientId || '',
  desktopClientSecret: process.env.GOOGLE_DESKTOP_CLIENT_SECRET || current.desktopClientSecret || '',
};
fs.writeFileSync(file, `${JSON.stringify(next, null, 2)}\n`);
console.log(
  `google-config.json: web ${next.webClientId ? 'set' : 'empty'}, desktop ${next.desktopClientId ? 'set' : 'empty'}`,
);
