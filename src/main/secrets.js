'use strict';

const fs = require('node:fs');
const path = require('node:path');

/**
 * Stores the OpenAI key on disk, encrypted with the OS keychain
 * (DPAPI on Windows) via Electron safeStorage when available.
 */
class Secrets {
  constructor(dir, safeStorage) {
    this.file = path.join(dir, 'secret.bin');
    this.safe = safeStorage;
  }

  canEncrypt() {
    try {
      return Boolean(this.safe && this.safe.isEncryptionAvailable());
    } catch {
      return false;
    }
  }

  get() {
    try {
      if (!fs.existsSync(this.file)) return '';
      const buf = fs.readFileSync(this.file);
      if (buf.subarray(0, 4).toString() === 'enc:') {
        return this.safe.decryptString(buf.subarray(4));
      }
      if (buf.subarray(0, 4).toString() === 'raw:') {
        return buf.subarray(4).toString('utf8');
      }
    } catch {
      // unreadable secret (e.g. copied from another PC) — treat as missing
    }
    return '';
  }

  set(value) {
    const key = String(value || '').trim();
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    if (!key) {
      if (fs.existsSync(this.file)) fs.unlinkSync(this.file);
      return;
    }
    const payload = this.canEncrypt()
      ? Buffer.concat([Buffer.from('enc:'), this.safe.encryptString(key)])
      : Buffer.concat([Buffer.from('raw:'), Buffer.from(key, 'utf8')]);
    fs.writeFileSync(this.file, payload);
  }
}

module.exports = { Secrets };
