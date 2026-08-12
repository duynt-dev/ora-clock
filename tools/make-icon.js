/**
 * Generates assets/icon.png (256x256) + assets/tray.png (32x32) with no dependencies.
 * Minimal PNG encoder (RGBA, no filtering) using Node's zlib.
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function encodePNG(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** Draw the clock glyph at an arbitrary size with 4x supersampling. */
function draw(size) {
  const S = 4;
  const W = size * S;
  const acc = new Float32Array(W * W * 4);
  const cx = W / 2;
  const cy = W / 2;
  const radius = W * 0.44;
  const corner = W * 0.22;

  const inRoundRect = (x, y) => {
    const m = W * 0.03;
    const x0 = m;
    const y0 = m;
    const x1 = W - m;
    const y1 = W - m;
    if (x < x0 || y < y0 || x > x1 || y > y1) return false;
    const dx = Math.max(x0 + corner - x, 0, x - (x1 - corner));
    const dy = Math.max(y0 + corner - y, 0, y - (y1 - corner));
    return dx * dx + dy * dy <= corner * corner;
  };

  const segments = [
    // hour hand (pointing up-right), minute hand (pointing down-right)
    { x1: cx, y1: cy, x2: cx + radius * 0.36, y2: cy - radius * 0.34, w: W * 0.045 },
    { x1: cx, y1: cy, x2: cx + radius * 0.1, y2: cy + radius * 0.6, w: W * 0.035 },
  ];

  const distToSeg = (px, py, s) => {
    const vx = s.x2 - s.x1;
    const vy = s.y2 - s.y1;
    const wx = px - s.x1;
    const wy = py - s.y1;
    const t = Math.max(0, Math.min(1, (wx * vx + wy * vy) / (vx * vx + vy * vy)));
    return Math.hypot(px - (s.x1 + t * vx), py - (s.y1 + t * vy));
  };

  for (let y = 0; y < W; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      if (!inRoundRect(x + 0.5, y + 0.5)) continue;
      // background: vertical gradient (indigo -> deep slate)
      const t = y / W;
      let r = 26 + 22 * (1 - t);
      let g = 30 + 26 * (1 - t);
      let b = 54 + 46 * (1 - t);
      let a = 255;

      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      const ringOuter = radius;
      const ringInner = radius - W * 0.035;
      if (d <= ringOuter && d >= ringInner) {
        r = 236; g = 240; b = 255;
      } else if (d < ringInner) {
        r += 8; g += 10; b += 16;
      }
      for (const s of segments) {
        if (distToSeg(x + 0.5, y + 0.5, s) <= s.w) { r = 122; g = 214; b = 255; }
      }
      if (d <= W * 0.028) { r = 255; g = 255; b = 255; }

      acc[i] = r; acc[i + 1] = g; acc[i + 2] = b; acc[i + 3] = a;
    }
  }

  // downsample
  const out = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < S; sy++) {
        for (let sx = 0; sx < S; sx++) {
          const i = ((y * S + sy) * W + (x * S + sx)) * 4;
          const al = acc[i + 3] / 255;
          r += acc[i] * al; g += acc[i + 1] * al; b += acc[i + 2] * al; a += acc[i + 3];
        }
      }
      const n = S * S;
      const alpha = a / n;
      const norm = alpha > 0 ? (alpha / 255) * n : 1;
      const o = (y * size + x) * 4;
      out[o] = Math.min(255, Math.round(r / norm));
      out[o + 1] = Math.min(255, Math.round(g / norm));
      out[o + 2] = Math.min(255, Math.round(b / norm));
      out[o + 3] = Math.round(alpha);
    }
  }
  return encodePNG(size, size, out);
}

const dir = path.join(__dirname, '..', 'assets');
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'icon.png'), draw(256));
fs.writeFileSync(path.join(dir, 'tray.png'), draw(32));
console.log('Wrote assets/icon.png and assets/tray.png');
