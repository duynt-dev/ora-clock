'use strict';
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const DEFAULTS = {
  // --- appearance ---
  language: 'en',            // en | vi
  face: 'flip',              // flip | digital | analog | ring | word | binary
  theme: 'obsidian',         // pure black, like the classic Fliqlo screensaver
  glass: true,               // liquid glass panels
  glassStrength: 18,         // backdrop blur px
  liquid: false,             // animated refraction layer on top of the blur
  acrylic: true,             // native Win11 window backdrop
  accentGlow: true,
  aurora: false,             // drifting colour blobs behind the glass
  background: { type: 'theme', value: '', blur: 0, dim: 0.35 }, // theme | gradient | image | youtube
  fontScale: 1,
  uiScale: 1,

  // --- typography ---
  clockFont: 'fliqlo',       // id from src/renderer/js/fonts.js, or 'custom'
  clockFontCustom: '',       // family name typed by the user
  clockWeight: 0,            // 0 = each face keeps its designed weight

  // --- user-made theme (used when theme === 'custom') ---
  customTheme: {
    mode: 'dark',
    accent: '#7ad6ff',
    accent2: '#9b7bff',
    bg1: '#1e2233',
    bg2: '#07080f',
    fg: '#eef1ff',
    card1: '#1d1d1f',
    card2: '#0b0b0c',
    cardFg: '#dedee1',
  },

  // --- clock behaviour ---
  hour24: false,             // the classic Fliqlo face shows 12h with AM/PM
  showSeconds: false,
  showDate: false,
  dateFormat: 'EEEE, d MMMM yyyy',
  locale: '',                // '' = follow the app language
  showAmPm: true,
  blinkColon: true,          // digital face
  flipSeparator: false,      // flip face: classic Fliqlo has no colon
  analogNumbers: true,
  flipLabels: false,
  timezone: '',              // '' = local
  burnInShift: false,        // slowly drift the clock to protect OLED panels
  nightDim: { enabled: false, from: '22:00', to: '06:00', opacity: 0.55 },

  // --- window ---
  alwaysOnTop: false,
  clickThrough: false,
  opacity: 1,
  hideOnBlur: false,
  autoHideUI: true,
  startMinimizedToTray: false,
  launchAtLogin: false,
  keepAwake: false,

  // --- tools ---
  worldClocks: [],           // [{label, tz}]
  pomodoro: { work: 25, short: 5, long: 15, rounds: 4, autoStart: true, sound: true },
  alarms: [],                // [{id, time:'07:30', label, days:[0..6], enabled, sound}]
  soundVolume: 0.6,

  // --- players ---
  player: 'none',            // none | spotify | youtube
  spotify: { clientId: '', refreshToken: '', accessToken: '', expiresAt: 0, port: 8888 },
  youtube: { lastUrl: '', volume: 60, videoAsBackground: false, loop: true },

  // --- hotkeys (global) ---
  hotkeys: {
    enabled: true,
    toggleWindow: 'Alt+Shift+C',
    playPause: '',
    nextTrack: '',
    prevTrack: '',
    fullscreen: '',
  },

  // --- internal ---
  panelTab: 'faces',
  windowBounds: null,
  firstRun: true,
};

function deepMerge(base, patch) {
  if (Array.isArray(patch)) return patch.slice();
  if (patch && typeof patch === 'object' && !Array.isArray(base) && base && typeof base === 'object') {
    const out = { ...base };
    for (const k of Object.keys(patch)) out[k] = deepMerge(base[k], patch[k]);
    return out;
  }
  return patch === undefined ? base : patch;
}

class Store {
  constructor() {
    this.file = path.join(app.getPath('userData'), 'settings.json');
    this.data = { ...DEFAULTS };
    this.load();
    this._timer = null;
  }

  load() {
    try {
      const raw = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      this.data = deepMerge(DEFAULTS, raw);
    } catch {
      this.data = JSON.parse(JSON.stringify(DEFAULTS));
    }
  }

  get all() {
    return this.data;
  }

  get(key) {
    return this.data[key];
  }

  set(patch) {
    this.data = deepMerge(this.data, patch);
    this.saveSoon();
    return this.data;
  }

  saveSoon() {
    clearTimeout(this._timer);
    this._timer = setTimeout(() => this.save(), 250);
  }

  save() {
    try {
      fs.mkdirSync(path.dirname(this.file), { recursive: true });
      fs.writeFileSync(this.file, JSON.stringify(this.data, null, 2));
    } catch (err) {
      console.error('[store] save failed', err);
    }
  }

  reset() {
    const keep = { spotify: this.data.spotify };
    this.data = deepMerge(JSON.parse(JSON.stringify(DEFAULTS)), keep);
    this.save();
    return this.data;
  }
}

module.exports = { Store, DEFAULTS };
