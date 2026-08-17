/* ---------------------------------------------------------------
   Browser fallback for `window.api`.
   Only loaded when the page runs outside Electron (design preview /
   quick UI iteration). Settings live in localStorage; anything that
   needs the OS or Spotify is stubbed out.
   --------------------------------------------------------------- */

const DEFAULTS = {
  language: 'en',
  face: 'flip', theme: 'obsidian', glass: true, glassStrength: 18, liquid: false,
  acrylic: false, accentGlow: true, aurora: false,
  background: { type: 'theme', value: '', blur: 0, dim: 0.35 },
  fontScale: 1,
  clockFont: 'fliqlo', clockFontCustom: '', clockWeight: 0,
  customTheme: {
    mode: 'dark', accent: '#7ad6ff', accent2: '#9b7bff', bg1: '#1e2233', bg2: '#07080f',
    fg: '#eef1ff', card1: '#1d1d1f', card2: '#0b0b0c', cardFg: '#dedee1',
  },
  hour24: false, showSeconds: false, showDate: false, dateFormat: 'EEEE, d MMMM yyyy', locale: '',
  showAmPm: true, blinkColon: true, flipSeparator: false, analogNumbers: true, flipLabels: false,
  timezone: '', burnInShift: false,
  nightDim: { enabled: false, from: '22:00', to: '06:00', opacity: 0.55 },
  alwaysOnTop: false, clickThrough: false, opacity: 1, hideOnBlur: false,
  autoHideUI: true, startMinimizedToTray: false, launchAtLogin: false, keepAwake: false,
  worldClocks: [],
  pomodoro: { work: 25, short: 5, long: 15, rounds: 4, autoStart: true, sound: true },
  alarms: [], soundVolume: 0.6,
  player: 'none',
  spotify: { clientId: '', refreshToken: '', accessToken: '', expiresAt: 0, port: 8888 },
  youtube: { lastUrl: '', volume: 60, videoAsBackground: false, loop: true },
  hotkeys: { enabled: true, toggleWindow: 'Alt+Shift+C', playPause: '', nextTrack: '', prevTrack: '', fullscreen: '' },
  panelTab: 'faces', windowBounds: null, firstRun: false,
};

const merge = (base, patch) => {
  if (Array.isArray(patch)) return patch.slice();
  if (patch && typeof patch === 'object' && base && typeof base === 'object' && !Array.isArray(base)) {
    const out = { ...base };
    for (const k of Object.keys(patch)) out[k] = merge(base[k], patch[k]);
    return out;
  }
  return patch === undefined ? base : patch;
};

const KEY = 'ora.dev.settings';
let state = merge(DEFAULTS, JSON.parse(localStorage.getItem(KEY) || '{}'));
const save = () => localStorage.setItem(KEY, JSON.stringify(state));
const noop = () => () => {};

window.api = {
  settings: {
    get: async () => state,
    set: async (patch) => { state = merge(state, patch); save(); return state; },
    reset: async () => { state = { ...DEFAULTS }; save(); return state; },
    onChange: noop,
  },
  window: {
    action: async (a) => {
      if (a === 'fullscreen') document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
      return { fullscreen: !!document.fullscreenElement, maximized: false };
    },
    setSize: async () => null,
    state: async () => ({ fullscreen: false, maximized: false, supportsAcrylic: false }),
    onFullscreen: noop, onMaximized: noop, onFocus: noop,
  },
  app: {
    openExternal: async (url) => window.open(url, '_blank'),
    pickImage: async () => null,
    fonts: async () => [],
    info: async () => ({ version: 'dev', platform: 'browser', electron: '—', settingsPath: 'localStorage' }),
    onOpenSettings: noop, onHotkey: noop,
  },
  spotify: {
    status: async () => ({ connected: false, hasClientId: !!state.spotify.clientId, redirectUri: 'http://127.0.0.1:8888/callback' }),
    authorize: async () => ({ ok: false, error: 'Chỉ khả dụng trong ứng dụng desktop' }),
    logout: async () => ({ ok: true }),
    api: async () => ({ ok: false, error: 'Chỉ khả dụng trong ứng dụng desktop' }),
  },
};

document.documentElement.dataset.preview = 'true';
