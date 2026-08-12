/* Tiny helpers shared by every module. */

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/** h('div.cls', {attrs}, ...children) */
export function h(tag, attrs = {}, ...children) {
  const [name, ...classes] = String(tag).split('.');
  const node = document.createElement(name || 'div');
  if (classes.length) node.className = classes.join(' ');
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === false || v === null || v === undefined) continue;
    if (k === 'class') node.className += (node.className ? ' ' : '') + v;
    else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
    else if (k === 'html') node.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat(4)) {
    if (c === null || c === undefined || c === false) continue;
    node.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return node;
}

export const svg = (inner, viewBox = '0 0 24 24') =>
  `<svg viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;

export const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
export const pad = (n, len = 2) => String(n).padStart(len, '0');

export function getPath(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
}

/** Builds the nested patch object for a dotted path: 'a.b' -> {a:{b:v}} */
export function patchFor(path, value) {
  const keys = path.split('.');
  const out = {};
  let cur = out;
  keys.forEach((k, i) => {
    if (i === keys.length - 1) cur[k] = value;
    else cur = cur[k] = {};
  });
  return out;
}

/* ------------------------------- time ------------------------------- */

const zoneCache = new Map();
function zoneFormatter(tz) {
  if (!zoneCache.has(tz)) {
    zoneCache.set(tz, new Intl.DateTimeFormat('en-US', {
      timeZone: tz || undefined,
      hourCycle: 'h23',
      year: 'numeric', month: 'numeric', day: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      weekday: 'short',
    }));
  }
  return zoneCache.get(tz);
}

const WD = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/** Calendar fields of `date` as seen in `tz` ('' = system zone). */
export function zonedParts(date, tz) {
  if (!tz) {
    return {
      year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate(),
      hour: date.getHours(), minute: date.getMinutes(), second: date.getSeconds(),
      ms: date.getMilliseconds(), weekday: date.getDay(),
    };
  }
  let parts;
  try {
    parts = zoneFormatter(tz).formatToParts(date);
  } catch {
    return zonedParts(date, '');
  }
  const get = (t) => parts.find((p) => p.type === t)?.value;
  return {
    year: +get('year'), month: +get('month'), day: +get('day'),
    hour: +get('hour') % 24, minute: +get('minute'), second: +get('second'),
    ms: date.getMilliseconds(), weekday: WD[get('weekday')] ?? date.getDay(),
  };
}

export function isValidTimeZone(tz) {
  if (!tz) return true;
  try { new Intl.DateTimeFormat('en', { timeZone: tz }); return true; } catch { return false; }
}

export function tzOffsetLabel(date, tz) {
  try {
    const s = new Intl.DateTimeFormat('en-US', { timeZone: tz || undefined, timeZoneName: 'shortOffset' })
      .formatToParts(date).find((p) => p.type === 'timeZoneName')?.value || '';
    return s.replace('GMT', 'UTC');
  } catch { return ''; }
}

const DATE_FORMATS = {
  'EEEE, d MMMM yyyy': { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
  'EEEE, d MMMM': { weekday: 'long', day: 'numeric', month: 'long' },
  'EEE, d MMM yyyy': { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' },
  'd/M/yyyy': { day: 'numeric', month: 'numeric', year: 'numeric' },
  'MMMM d, yyyy': { month: 'long', day: 'numeric', year: 'numeric' },
  'EEEE': { weekday: 'long' },
};

export function formatDate(date, { format, locale, timezone }) {
  const opts = DATE_FORMATS[format] || DATE_FORMATS['EEEE, d MMMM yyyy'];
  try {
    return new Intl.DateTimeFormat(locale || navigator.language, { ...opts, timeZone: timezone || undefined }).format(date);
  } catch {
    return date.toDateString();
  }
}

export const DATE_FORMAT_IDS = Object.keys(DATE_FORMATS);

/** 'HH:MM' -> minutes since midnight */
export const hhmmToMinutes = (v) => {
  const [a, b] = String(v || '0:0').split(':').map(Number);
  return (a || 0) * 60 + (b || 0);
};

/* ------------------------------- misc ------------------------------- */

export function toast(message, kind = '', life = 2600) {
  const host = $('#toast-host');
  if (!host) return;
  const node = h('div.toast', { class: kind, style: { '--life': `${life}ms` } }, message);
  host.append(node);
  setTimeout(() => node.remove(), life + 500);
}

export function debounce(fn, ms = 200) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

/** Short beep chime for alarms / pomodoro, no audio assets required. */
let audioCtx = null;
export function chime(volume = 0.6, pattern = [880, 1320]) {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    pattern.forEach((freq, i) => {
      const t0 = audioCtx.currentTime + i * 0.24;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t0);
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume * 0.5), t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.42);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.45);
    });
  } catch { /* audio unavailable */ }
}

export const uid = () => Math.random().toString(36).slice(2, 10);

export const COMMON_ZONES = [
  ['Asia/Ho_Chi_Minh', 'Ho Chi Minh City'], ['Asia/Bangkok', 'Bangkok'], ['Asia/Singapore', 'Singapore'],
  ['Asia/Tokyo', 'Tokyo'], ['Asia/Seoul', 'Seoul'], ['Asia/Shanghai', 'Shanghai'],
  ['Asia/Kolkata', 'Mumbai'], ['Asia/Dubai', 'Dubai'], ['Europe/Moscow', 'Moscow'],
  ['Europe/Berlin', 'Berlin'], ['Europe/Paris', 'Paris'], ['Europe/London', 'London'],
  ['America/New_York', 'New York'], ['America/Chicago', 'Chicago'], ['America/Denver', 'Denver'],
  ['America/Los_Angeles', 'Los Angeles'], ['America/Sao_Paulo', 'São Paulo'],
  ['Australia/Sydney', 'Sydney'], ['Pacific/Auckland', 'Auckland'], ['UTC', 'UTC'],
];
