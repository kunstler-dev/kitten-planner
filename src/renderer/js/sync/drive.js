// Minimal Google Drive v3 client for the app's hidden "appDataFolder": files there are private
// to Kitten Planner and invisible in the user's Drive UI. Works in the browser and in Node tests.

const API = 'https://www.googleapis.com/drive/v3/files';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files';

export class DriveError extends Error {
  /** code: 'auth' (sign-in needed), 'offline', 'http' */
  constructor(code, detail = '') {
    super(detail || code);
    this.code = code;
    this.detail = detail;
  }
}

export class Drive {
  /** getToken({ force }) resolves to an OAuth access token with the drive.appdata scope. */
  constructor({ getToken, fetchImpl }) {
    this.getToken = getToken;
    this.fetch = fetchImpl || ((...args) => fetch(...args));
    this.ids = new Map();
  }

  async request(url, init = {}, retried = false) {
    const token = await this.getToken({ force: retried });
    if (!token) throw new DriveError('auth');
    let res;
    try {
      res = await this.fetch(url, { ...init, headers: { ...(init.headers || {}), Authorization: `Bearer ${token}` } });
    } catch (err) {
      throw new DriveError('offline', err.message);
    }
    if (res.status === 401 && !retried) return this.request(url, init, true);
    if (res.status === 401) throw new DriveError('auth', await res.text());
    if (!res.ok) throw new DriveError('http', `${res.status} ${(await res.text()).slice(0, 200)}`);
    return res;
  }

  async find(name) {
    if (this.ids.has(name)) return this.ids.get(name);
    const q = encodeURIComponent(`name = '${name.replace(/'/g, "\\'")}' and trashed = false`);
    const res = await this.request(`${API}?spaces=appDataFolder&q=${q}&fields=files(id,version)&pageSize=10`);
    const file = (await res.json()).files?.[0] || null;
    if (file) this.ids.set(name, file.id);
    return file ? file.id : null;
  }

  async read(name) {
    const id = await this.find(name);
    if (!id) return null;
    try {
      return await this.request(`${API}/${id}?alt=media`);
    } catch (err) {
      if (err.code === 'http' && err.detail.startsWith('404')) {
        this.ids.delete(name);
        return null;
      }
      throw err;
    }
  }

  async write(name, body, mime) {
    const id = await this.find(name);
    if (id) {
      const res = await this.request(`${UPLOAD}/${id}?uploadType=media&fields=id,version`, {
        method: 'PATCH',
        headers: { 'Content-Type': mime },
        body,
      });
      return (await res.json()).version;
    }
    const boundary = `kp${Math.random().toString(36).slice(2)}`;
    const meta = JSON.stringify({ name, parents: ['appDataFolder'], mimeType: mime });
    const multipart = new Blob([
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n`,
      `--${boundary}\r\nContent-Type: ${mime}\r\n\r\n`,
      body,
      `\r\n--${boundary}--`,
    ]);
    const res = await this.request(`${UPLOAD}?uploadType=multipart&fields=id,version`, {
      method: 'POST',
      headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
      body: multipart,
    });
    const file = await res.json();
    this.ids.set(name, file.id);
    return file.version;
  }

  async readJson(name) {
    const res = await this.read(name);
    return res ? res.json() : null;
  }

  writeJson(name, data) {
    return this.write(name, JSON.stringify(data), 'application/json');
  }

  async readBlob(name) {
    const res = await this.read(name);
    return res ? res.blob() : null;
  }

  async remove(name) {
    const id = await this.find(name);
    if (!id) return;
    await this.request(`${API}/${id}`, { method: 'DELETE' }).catch((err) => {
      if (!(err.code === 'http' && err.detail.startsWith('404'))) throw err;
    });
    this.ids.delete(name);
  }
}
