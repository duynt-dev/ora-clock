'use strict';
/**
 * Lists the font families installed on this machine so the settings panel can
 * offer them. Electron has no API for this, so we ask the OS once and cache it.
 * Any failure just yields an empty list — the panel then shows its presets only.
 */
const { execFile } = require('child_process');

const TIMEOUT = 8000;
let cache = null;

function run(cmd, args) {
  return new Promise((resolve) => {
    execFile(cmd, args, { timeout: TIMEOUT, windowsHide: true, maxBuffer: 4 << 20 }, (err, stdout) => {
      resolve(err ? '' : String(stdout));
    });
  });
}

async function query() {
  if (process.platform === 'win32') {
    const out = await run('powershell.exe', [
      '-NoProfile', '-NonInteractive', '-Command',
      'Add-Type -AssemblyName System.Drawing; ' +
      '(New-Object System.Drawing.Text.InstalledFontCollection).Families | ForEach-Object { $_.Name }',
    ]);
    return out.split(/\r?\n/);
  }
  // macOS and Linux both ship fontconfig in practice; on mac it is optional but common
  const out = await run('fc-list', [':', 'family']);
  return out.split(/\r?\n/).flatMap((line) => line.split(','));
}

async function listFonts() {
  if (cache) return cache;
  try {
    const names = (await query())
      .map((n) => n.trim())
      .filter((n) => n && !n.startsWith('@') && !/[^\p{L}\p{N} .'&+_-]/u.test(n));
    cache = [...new Set(names)].sort((a, b) => a.localeCompare(b));
  } catch {
    cache = [];
  }
  return cache;
}

module.exports = { listFonts };
