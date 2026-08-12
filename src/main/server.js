'use strict';
/**
 * Tiny loopback file server for the renderer.
 *
 * The UI could be loaded straight from disk with file://, but embedded
 * players (YouTube's IFrame API in particular) need a real http origin to
 * complete their postMessage handshake — from file:// the player never
 * becomes ready. Serving the same files from 127.0.0.1 on a random port
 * fixes that without any external network access.
 *
 * User-picked wallpapers live outside the served folder, so they go through
 * /local, gated by a per-session token and an image-extension check.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.webp': 'image/webp', '.avif': 'image/avif',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
};
const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.bmp']);

class RendererServer {
  constructor(root) {
    this.root = path.resolve(root);
    this.token = crypto.randomBytes(16).toString('hex');
    this.port = 0;
  }

  get origin() { return `http://127.0.0.1:${this.port}`; }

  listen() {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => this.handle(req, res));
      this.server.on('error', reject);
      // port 0 → the OS hands us a free one
      this.server.listen(0, '127.0.0.1', () => {
        this.port = this.server.address().port;
        resolve(this.origin);
      });
    });
  }

  handle(req, res) {
    let url;
    try {
      url = new URL(req.url, this.origin);
    } catch {
      res.writeHead(400).end();
      return;
    }

    if (url.pathname === '/local') {
      if (url.searchParams.get('t') !== this.token) { res.writeHead(403).end(); return; }
      const file = url.searchParams.get('p') || '';
      if (!IMAGE_EXT.has(path.extname(file).toLowerCase())) { res.writeHead(403).end(); return; }
      this.send(res, file);
      return;
    }

    const rel = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
    const file = path.join(this.root, rel);
    if (!file.startsWith(this.root)) { res.writeHead(403).end(); return; }
    this.send(res, file);
  }

  send(res, file) {
    fs.readFile(file, (err, buf) => {
      if (err) { res.writeHead(404).end('Not found'); return; }
      res.writeHead(200, {
        'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
        'Cache-Control': 'no-store',
      });
      res.end(buf);
    });
  }

  close() {
    try { this.server?.close(); } catch { /* already closed */ }
  }
}

module.exports = { RendererServer };
