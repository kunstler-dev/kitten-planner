// Google sign-in for the phone/web version. A static site has no server to keep a refresh token,
// so it uses the OAuth implicit flow by full-page redirect (popups are unreliable in iOS home-screen
// apps). Tokens last an hour; on the next launch the app quietly bounces through Google
// (prompt=none) to get a fresh one.
const KEY = 'kp-google';
const STATE_KEY = 'kp-oauth-state';
const REAUTH_KEY = 'kp-oauth-reauth-at';
const SCOPE = 'https://www.googleapis.com/auth/drive.appdata email';

let config;
async function loadConfig() {
  if (!config) {
    try {
      config = await (await fetch('google-config.json', { cache: 'no-cache' })).json();
    } catch {
      config = {};
    }
  }
  return config;
}

const appUrl = () => location.origin + location.pathname.replace(/index\.html$/, '');
const read = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}');
  } catch {
    return {};
  }
};
const write = (value) => localStorage.setItem(KEY, JSON.stringify(value));

async function redirect({ silent }) {
  const cfg = await loadConfig();
  const saved = read();
  const stateParam = crypto.getRandomValues(new Uint32Array(4)).join('-');
  sessionStorage.setItem(STATE_KEY, stateParam);
  const params = new URLSearchParams({
    client_id: cfg.webClientId,
    redirect_uri: appUrl(),
    response_type: 'token',
    scope: SCOPE,
    state: stateParam,
    include_granted_scopes: 'true',
  });
  if (saved.email) params.set('login_hint', saved.email);
  if (silent) params.set('prompt', 'none');
  else if (!saved.email) params.set('prompt', 'select_account');
  location.assign(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}

/** Consumes the #access_token=… fragment Google sends back. Call before the app renders. */
export async function handleOAuthRedirect() {
  const hash = location.hash.slice(1);
  if (!/(^|&)(access_token|error)=/.test(hash)) return;
  const p = new URLSearchParams(hash);
  history.replaceState(null, '', appUrl());
  const expected = sessionStorage.getItem(STATE_KEY);
  sessionStorage.removeItem(STATE_KEY);
  if (!expected || p.get('state') !== expected || !p.get('access_token')) return;
  const token = p.get('access_token');
  const saved = { ...read(), connected: true, token, exp: Date.now() + (Number(p.get('expires_in')) - 60) * 1000 };
  try {
    const info = await (
      await fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: `Bearer ${token}` } })
    ).json();
    if (info.email) saved.email = info.email;
  } catch {
    // email is only cosmetic
  }
  write(saved);
}

export const webCloud = {
  async status() {
    const cfg = await loadConfig();
    const saved = read();
    return { configured: Boolean(cfg.webClientId), connected: Boolean(saved.connected), email: saved.email || '' };
  },
  async connect() {
    await redirect({ silent: false });
    return new Promise(() => {}); // the page navigates away
  },
  async disconnect() {
    const saved = read();
    localStorage.removeItem(KEY);
    if (saved.token) {
      fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(saved.token)}`, {
        method: 'POST',
        mode: 'no-cors',
      }).catch(() => {});
    }
    return true;
  },
  async token() {
    const saved = read();
    if (!saved.connected || !saved.token || Date.now() > saved.exp) return null;
    return saved.token;
  },
  /** Silent re-sign-in when the hour-long token ran out (at most every few minutes). */
  reauth() {
    const last = Number(sessionStorage.getItem(REAUTH_KEY) || 0);
    if (Date.now() - last < 5 * 60 * 1000 || !navigator.onLine) return false;
    sessionStorage.setItem(REAUTH_KEY, String(Date.now()));
    redirect({ silent: true });
    return true;
  },
};
