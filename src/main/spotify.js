'use strict';
/**
 * Spotify Authorization Code + PKCE flow, driven from the main process.
 *
 * No client secret is needed (and none is stored). The user creates a free app at
 * https://developer.spotify.com/dashboard, whitelists http://127.0.0.1:8888/callback
 * as a redirect URI, and pastes the Client ID into the app settings.
 *
 * Playback *control* needs a Spotify Premium account; reading "now playing" works on free.
 */
const http = require('http');
const crypto = require('crypto');
const { shell } = require('electron');

const AUTH_URL = 'https://accounts.spotify.com/authorize';
const TOKEN_URL = 'https://accounts.spotify.com/api/token';
const API = 'https://api.spotify.com/v1';
const SCOPES = [
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
  'user-read-private',
  'user-read-email',
  'playlist-read-private',
  'user-library-read',
].join(' ');

const b64url = (buf) => buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

class Spotify {
  constructor(store) {
    this.store = store;
    this.server = null;
  }

  get cfg() {
    return this.store.get('spotify');
  }

  get connected() {
    return Boolean(this.cfg.refreshToken);
  }

  redirectUri() {
    return `http://127.0.0.1:${this.cfg.port || 8888}/callback`;
  }

  /** Opens the system browser and resolves once the loopback server catches the code. */
  authorize() {
    const { clientId } = this.cfg;
    if (!clientId) return Promise.reject(new Error('Missing Spotify Client ID'));

    const verifier = b64url(crypto.randomBytes(64));
    const challenge = b64url(crypto.createHash('sha256').update(verifier).digest());
    const state = b64url(crypto.randomBytes(16));
    const port = this.cfg.port || 8888;

    return new Promise((resolve, reject) => {
      this.stopServer();
      const timeout = setTimeout(() => {
        this.stopServer();
        reject(new Error('Authorization timed out'));
      }, 5 * 60 * 1000);

      const finish = (err, value) => {
        clearTimeout(timeout);
        this.stopServer();
        err ? reject(err) : resolve(value);
      };

      this.server = http.createServer(async (req, res) => {
        const url = new URL(req.url, `http://127.0.0.1:${port}`);
        if (url.pathname !== '/callback') {
          res.writeHead(404).end('Not found');
          return;
        }
        const send = (title, msg) => {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`<!doctype html><meta charset="utf-8"><title>${title}</title>
            <body style="margin:0;height:100vh;display:grid;place-items:center;background:#12131a;color:#e8ecff;
              font:16px/1.6 system-ui,Segoe UI,sans-serif;text-align:center">
              <div><h2 style="margin:0 0 8px">${title}</h2><p style="opacity:.7;margin:0">${msg}</p></div>`);
        };

        if (url.searchParams.get('error')) {
          send('Connection failed', url.searchParams.get('error'));
          return finish(new Error(url.searchParams.get('error')));
        }
        if (url.searchParams.get('state') !== state) {
          send('Connection failed', 'State mismatch');
          return finish(new Error('State mismatch'));
        }
        const code = url.searchParams.get('code');
        send('Spotify connected ✓', 'You can close this tab and go back to Ora Clock.');
        try {
          const tok = await this.exchange({
            grant_type: 'authorization_code',
            code,
            redirect_uri: this.redirectUri(),
            client_id: clientId,
            code_verifier: verifier,
          });
          const me = await this.api('GET', '/me').catch(() => null);
          finish(null, { ok: true, profile: me });
        } catch (err) {
          finish(err);
        }
      });

      this.server.on('error', (err) => finish(err));
      this.server.listen(port, '127.0.0.1', () => {
        const params = new URLSearchParams({
          client_id: clientId,
          response_type: 'code',
          redirect_uri: this.redirectUri(),
          state,
          scope: SCOPES,
          code_challenge_method: 'S256',
          code_challenge: challenge,
          show_dialog: 'false',
        });
        shell.openExternal(`${AUTH_URL}?${params}`);
      });
    });
  }

  stopServer() {
    if (this.server) {
      try { this.server.close(); } catch { /* already closed */ }
      this.server = null;
    }
  }

  async exchange(body) {
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(body),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error_description || json.error || 'Token request failed');
    this.store.set({
      spotify: {
        accessToken: json.access_token,
        expiresAt: Date.now() + (json.expires_in - 60) * 1000,
        ...(json.refresh_token ? { refreshToken: json.refresh_token } : {}),
      },
    });
    return json;
  }

  async token() {
    const cfg = this.cfg;
    if (cfg.accessToken && Date.now() < cfg.expiresAt) return cfg.accessToken;
    if (!cfg.refreshToken) throw new Error('Not connected');
    const json = await this.exchange({
      grant_type: 'refresh_token',
      refresh_token: cfg.refreshToken,
      client_id: cfg.clientId,
    });
    return json.access_token;
  }

  /** Thin Web API proxy. Returns null for 204 (common for player commands). */
  async api(method, path, body) {
    const token = await this.token();
    const res = await fetch(path.startsWith('http') ? path : API + path, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 204 || res.status === 202) return null;
    const text = await res.text();
    const json = text ? JSON.parse(text) : null;
    if (!res.ok) {
      const err = new Error(json?.error?.message || `Spotify ${res.status}`);
      err.status = res.status;
      err.reason = json?.error?.reason;
      throw err;
    }
    return json;
  }

  logout() {
    this.store.set({ spotify: { refreshToken: '', accessToken: '', expiresAt: 0 } });
  }
}

module.exports = { Spotify };
