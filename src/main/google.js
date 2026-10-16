'use strict';

// Google sign-in for the desktop app (OAuth 2.0 for installed apps: system browser + loopback
// redirect + PKCE). Only the drive.appdata scope is requested: the app can see nothing in the
// user's Drive except its own hidden folder. The refresh token is encrypted with safeStorage.

const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const REVOKE_URL = 'https://oauth2.googleapis.com/revoke';
const SCOPES = 'https://www.googleapis.com/auth/drive.appdata openid email';
const SIGN_IN_TIMEOUT = 5 * 60 * 1000;

const b64url = (buf) => buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

function emailFromIdToken(idToken) {
  try {
    return JSON.parse(Buffer.from(idToken.split('.')[1], 'base64url').toString('utf8')).email || '';
  } catch {
    return '';
  }
}

const DONE_PAGE = `<!doctype html><meta charset="utf-8"><title>Kitten Planner</title>
<body style="font-family:system-ui,sans-serif;background:#f8f5f2;color:#4a4352;display:grid;place-items:center;height:100vh;margin:0">
<div style="text-align:center"><div style="font-size:48px">🐾</div>
<h2>Готово! Можна повернутися в Kitten Planner.</h2><p>Fertig! Du kannst zu Kitten Planner zurückkehren.</p></div>`;

class GoogleAuth {
  /**
   * @param {object} opts
   * @param {string} opts.dir           where google.bin is stored
   * @param {object} opts.safeStorage   Electron safeStorage
   * @param {{desktopClientId: string, desktopClientSecret: string}} opts.config
   * @param {(url: string) => void} opts.openBrowser
   * @param {typeof fetch} opts.fetchImpl
   */
  constructor({ dir, safeStorage, config, openBrowser, fetchImpl }) {
    this.file = path.join(dir, 'google.bin');
    this.safeStorage = safeStorage;
    this.config = config || {};
    this.openBrowser = openBrowser;
    this.fetch = fetchImpl;
    this.access = null; // { token, exp }
  }

  configured() {
    return Boolean(this.config.desktopClientId && this.config.desktopClientSecret);
  }

  read() {
    try {
      const raw = fs.readFileSync(this.file);
      const text = this.safeStorage.isEncryptionAvailable()
        ? this.safeStorage.decryptString(raw)
        : raw.toString('utf8');
      return JSON.parse(text);
    } catch {
      return null;
    }
  }

  write(data) {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const text = JSON.stringify(data);
    const raw = this.safeStorage.isEncryptionAvailable()
      ? this.safeStorage.encryptString(text)
      : Buffer.from(text, 'utf8');
    fs.writeFileSync(this.file, raw);
  }

  status() {
    const saved = this.read();
    return { configured: this.configured(), connected: Boolean(saved?.refreshToken), email: saved?.email || '' };
  }

  async connect() {
    if (!this.configured()) return { ok: false, error: 'not_configured' };
    const verifier = b64url(crypto.randomBytes(32));
    const challenge = b64url(crypto.createHash('sha256').update(verifier).digest());
    const stateParam = b64url(crypto.randomBytes(16));

    const result = await new Promise((resolve, reject) => {
      const server = http.createServer((req, res) => {
        const url = new URL(req.url, 'http://127.0.0.1');
        if (url.pathname !== '/') {
          res.writeHead(404).end();
          return;
        }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(DONE_PAGE);
        clearTimeout(timeout);
        server.close();
        if (url.searchParams.get('state') !== stateParam) reject(new Error('state_mismatch'));
        else if (url.searchParams.get('error')) reject(new Error(url.searchParams.get('error')));
        else resolve({ code: url.searchParams.get('code'), redirectUri });
      });
      let redirectUri = '';
      const timeout = setTimeout(() => {
        server.close();
        reject(new Error('timeout'));
      }, SIGN_IN_TIMEOUT);
      server.listen(0, '127.0.0.1', () => {
        redirectUri = `http://127.0.0.1:${server.address().port}`;
        const params = new URLSearchParams({
          client_id: this.config.desktopClientId,
          redirect_uri: redirectUri,
          response_type: 'code',
          scope: SCOPES,
          code_challenge: challenge,
          code_challenge_method: 'S256',
          state: stateParam,
          access_type: 'offline',
          prompt: 'consent select_account',
        });
        this.openBrowser(`${AUTH_URL}?${params}`);
      });
    }).catch((err) => ({ error: err.message }));
    if (!result.code) return { ok: false, error: result.error || 'cancelled' };
    const { code, redirectUri } = result;

    const res = await this.fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.config.desktopClientId,
        client_secret: this.config.desktopClientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
        code_verifier: verifier,
      }).toString(),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.refresh_token) return { ok: false, error: json.error || `http_${res.status}` };
    const email = emailFromIdToken(json.id_token || '');
    this.write({ refreshToken: json.refresh_token, email });
    this.access = { token: json.access_token, exp: Date.now() + (json.expires_in - 60) * 1000 };
    return { ok: true, email };
  }

  /** A valid access token, refreshed when needed; null when signed out or access was revoked. */
  async token({ force = false } = {}) {
    if (!force && this.access && Date.now() < this.access.exp) return this.access.token;
    const saved = this.read();
    if (!saved?.refreshToken || !this.configured()) return null;
    const res = await this.fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.config.desktopClientId,
        client_secret: this.config.desktopClientSecret,
        refresh_token: saved.refreshToken,
        grant_type: 'refresh_token',
      }).toString(),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (json.error === 'invalid_grant') this.clear();
      return null;
    }
    this.access = { token: json.access_token, exp: Date.now() + (json.expires_in - 60) * 1000 };
    return this.access.token;
  }

  clear() {
    this.access = null;
    try {
      fs.unlinkSync(this.file);
    } catch {
      // already gone
    }
  }

  async disconnect() {
    const saved = this.read();
    this.clear();
    if (saved?.refreshToken) {
      await this.fetch(`${REVOKE_URL}?token=${encodeURIComponent(saved.refreshToken)}`, { method: 'POST' }).catch(
        () => null,
      );
    }
    return true;
  }
}

module.exports = { GoogleAuth, emailFromIdToken };
