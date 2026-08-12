/* ---------------------------------------------------------------
   Clock faces. Each face exposes:
     { id, label, thumb, create(settings) -> { el, update(ctx), destroy? } }
   `ctx` is { parts, date, settings } where parts is the zoned time.
   --------------------------------------------------------------- */
import { h, pad, svg } from './util.js';
import { t } from './i18n.js';

const FLIP_MS = 340;

const to12 = (hour) => ((hour % 12) || 12);
const meridiem = (hour) => (hour < 12 ? 'AM' : 'PM');

/* ============================== 1. FLIP ============================== */

function flipCard(initial, label) {
  const mk = (cls) => h(`div.fc.${cls}`, {}, h('span', {}, initial));
  const top = mk('top');
  const bottom = mk('bottom');
  const front = mk('top flap-front');
  const back = mk('bottom flap-back');
  const card = h('div.flip-card', {}, top, bottom, front, back, label ? h('div.flip-label', {}, label) : null);

  let value = initial;
  let timer = null;

  const settle = (v) => {
    bottom.firstChild.textContent = v;
    front.firstChild.textContent = v;
    card.classList.remove('flipping');
  };

  card.setValue = (v, animate = true) => {
    v = String(v);
    if (v === value) return;
    if (timer) { clearTimeout(timer); settle(value); }
    if (!animate) {
      value = v;
      [top, bottom, front].forEach((n) => { n.firstChild.textContent = v; });
      back.firstChild.textContent = v;
      return;
    }
    // top = new (revealed as the flap falls), bottom = old (covered as it rises)
    top.firstChild.textContent = v;
    bottom.firstChild.textContent = value;
    front.firstChild.textContent = value;
    back.firstChild.textContent = v;
    value = v;
    // restart the animation cleanly
    void card.offsetWidth;
    card.classList.add('flipping');
    timer = setTimeout(() => { timer = null; settle(v); }, FLIP_MS * 2 + 30);
  };
  return card;
}

const flipFace = {
  id: 'flip',
  label: 'Flip (Fliqlo)',
  thumb: svg('<rect x="2" y="6" width="9" height="12" rx="1.6"/><rect x="13" y="6" width="9" height="12" rx="1.6"/><path d="M2 12h9M13 12h9"/>'),
  create(s) {
    const hours = flipCard('00', s.flipLabels ? t('hour') : '');
    const mins = flipCard('00', s.flipLabels ? t('min') : '');
    const secs = flipCard('00');
    const sep = h('div.flip-sep', {}, h('i'), h('i'));
    const secGroup = h('div.flip-group.seconds', {}, secs);
    // AM/PM sits in the corner of the hour card and never flips — like Fliqlo
    const mer = h('div.flip-meridiem', {}, 'AM');
    hours.append(mer);
    const el = h('div.flip', {}, hours, sep, mins, secGroup);
    let first = true;

    return {
      el,
      update({ parts, settings }) {
        const hh = settings.hour24 ? parts.hour : to12(parts.hour);
        hours.setValue(settings.hour24 ? pad(hh) : String(hh), !first);
        mins.setValue(pad(parts.minute), !first);
        if (settings.showSeconds) secs.setValue(pad(parts.second), !first);
        secGroup.classList.toggle('hidden', !settings.showSeconds);
        mer.textContent = meridiem(parts.hour);
        mer.classList.toggle('hidden', settings.hour24 || !settings.showAmPm);
        el.classList.toggle('show-colon', !!settings.flipSeparator);
        first = false;
      },
    };
  },
};

/* ============================== 2. DIGITAL ============================== */

const digitalFace = {
  id: 'digital',
  label: 'Digital',
  thumb: svg('<text x="12" y="15.5" text-anchor="middle" font-size="9" font-family="system-ui" font-weight="300" fill="currentColor" stroke="none">12:45</text>'),
  create() {
    const hh = h('span.seg');
    const c1 = h('span.colon', {}, ':');
    const mm = h('span.seg');
    const ss = h('span.secs');
    const mer = h('span.mer');
    const el = h('div.digital', {}, hh, c1, mm, ss, mer);
    return {
      el,
      update({ parts, settings }) {
        hh.textContent = pad(settings.hour24 ? parts.hour : to12(parts.hour));
        mm.textContent = pad(parts.minute);
        ss.textContent = settings.showSeconds ? pad(parts.second) : '';
        mer.textContent = !settings.hour24 && settings.showAmPm ? meridiem(parts.hour) : '';
        el.classList.toggle('blink', !!settings.blinkColon);
      },
    };
  },
};

/* ============================== 3. ANALOG ============================== */

const analogFace = {
  id: 'analog',
  label: 'Analog',
  thumb: svg('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 1.8"/>'),
  create() {
    const ticks = Array.from({ length: 60 }, (_, i) => {
      const major = i % 5 === 0;
      const a = (i * 6 * Math.PI) / 180;
      const r1 = major ? 40 : 43;
      const r2 = 46;
      const x1 = 50 + r1 * Math.sin(a), y1 = 50 - r1 * Math.cos(a);
      const x2 = 50 + r2 * Math.sin(a), y2 = 50 - r2 * Math.cos(a);
      return `<line class="tick${major ? ' major' : ''}" x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}"/>`;
    }).join('');

    const nums = Array.from({ length: 12 }, (_, i) => {
      const a = ((i + 1) * 30 * Math.PI) / 180;
      const x = 50 + 32 * Math.sin(a), y = 50 - 32 * Math.cos(a);
      return `<text class="num" x="${x.toFixed(2)}" y="${y.toFixed(2)}">${i + 1}</text>`;
    }).join('');

    const el = h('div.analog', {
      html: `<svg viewBox="0 0 100 100">
        <circle class="dial" cx="50" cy="50" r="47"/>
        <circle class="rim" cx="50" cy="50" r="47"/>
        ${ticks}<g class="nums">${nums}</g>
        <line class="hand hour" x1="50" y1="54" x2="50" y2="27"/>
        <line class="hand min"  x1="50" y1="56" x2="50" y2="17"/>
        <line class="hand sec"  x1="50" y1="60" x2="50" y2="14"/>
        <circle class="pin" cx="50" cy="50" r="3.4"/>
        <circle class="pin-core" cx="50" cy="50" r="1.4"/>
      </svg>`,
    });

    const hourHand = el.querySelector('.hour');
    const minHand = el.querySelector('.min');
    const secHand = el.querySelector('.sec');
    const numsG = el.querySelector('.nums');

    return {
      el,
      update({ parts, settings }) {
        const sec = parts.second + parts.ms / 1000;
        const min = parts.minute + sec / 60;
        const hr = (parts.hour % 12) + min / 60;
        hourHand.style.transform = `rotate(${hr * 30}deg)`;
        minHand.style.transform = `rotate(${min * 6}deg)`;
        secHand.style.transform = `rotate(${sec * 6}deg)`;
        [hourHand, minHand, secHand].forEach((n) => { n.style.transformOrigin = '50px 50px'; });
        secHand.style.display = settings.showSeconds ? '' : 'none';
        numsG.style.display = settings.analogNumbers === false ? 'none' : '';
      },
    };
  },
};

/* ============================== 4. RING ============================== */

const ringFace = {
  id: 'ring',
  label: 'Rings',
  thumb: svg('<circle cx="12" cy="12" r="9" opacity=".3"/><path d="M12 3a9 9 0 017.8 4.5"/><circle cx="12" cy="12" r="5.5" opacity=".3"/><path d="M12 6.5a5.5 5.5 0 014.8 2.8"/>'),
  create() {
    const R = [46, 38, 30];
    const C = R.map((r) => 2 * Math.PI * r);
    const el = h('div.ring', {
      html: `<svg viewBox="0 0 100 100">
        ${R.map((r) => `<circle class="track" cx="50" cy="50" r="${r}" stroke-width="5"/>`).join('')}
        <circle class="arc-h" cx="50" cy="50" r="${R[0]}" stroke-width="5" stroke-dasharray="${C[0]}" stroke-dashoffset="${C[0]}"/>
        <circle class="arc-m" cx="50" cy="50" r="${R[1]}" stroke-width="5" stroke-dasharray="${C[1]}" stroke-dashoffset="${C[1]}"/>
        <circle class="arc-s" cx="50" cy="50" r="${R[2]}" stroke-width="5" stroke-dasharray="${C[2]}" stroke-dashoffset="${C[2]}"/>
      </svg>
      <div class="center"><b></b><small></small></div>`,
    });
    const arcs = ['.arc-h', '.arc-m', '.arc-s'].map((k) => el.querySelector(k));
    const time = el.querySelector('.center b');
    const sub = el.querySelector('.center small');

    return {
      el,
      update({ parts, settings }) {
        const sec = parts.second + parts.ms / 1000;
        const min = parts.minute + sec / 60;
        const hr = (parts.hour % 12) + min / 60;
        const fr = [hr / 12, min / 60, sec / 60];
        arcs.forEach((a, i) => { a.style.strokeDashoffset = C[i] * (1 - fr[i]); });
        arcs[2].style.display = settings.showSeconds ? '' : 'none';
        time.textContent = `${pad(settings.hour24 ? parts.hour : to12(parts.hour))}:${pad(parts.minute)}`;
        sub.textContent = settings.hour24 ? pad(parts.second) : meridiem(parts.hour);
      },
    };
  },
};

/* ============================== 5. WORD ============================== */

const WORD_ROWS = [
  'ITLISASAMPM',
  'ACQUARTERDC',
  'TWENTYFIVEX',
  'HALFSTENFTO',
  'PASTERUNINE',
  'ONESIXTHREE',
  'FOURFIVETWO',
  'EIGHTELEVEN',
  'SEVENTWELVE',
  'TENSEOCLOCK',
];
const W = {
  IT: [0, 0, 2], IS: [0, 3, 2], AM: [0, 7, 2], PM: [0, 9, 2],
  A: [1, 0, 1], QUARTER: [1, 2, 7],
  TWENTY: [2, 0, 6], FIVE_M: [2, 6, 4],
  HALF: [3, 0, 4], TEN_M: [3, 5, 3], TO: [3, 9, 2],
  PAST: [4, 0, 4], NINE: [4, 7, 4],
  ONE: [5, 0, 3], SIX: [5, 3, 3], THREE: [5, 6, 5],
  FOUR: [6, 0, 4], FIVE: [6, 4, 4], TWO: [6, 8, 3],
  EIGHT: [7, 0, 5], ELEVEN: [7, 5, 6],
  SEVEN: [8, 0, 5], TWELVE: [8, 5, 6],
  TEN: [9, 0, 3], OCLOCK: [9, 5, 6],
};
const HOUR_KEY = ['TWELVE', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN', 'ELEVEN'];

const wordFace = {
  id: 'word',
  label: 'Word',
  thumb: svg('<path d="M3 7h7M12 7h9M3 12h5M10 12h11M3 17h9M14 17h7" stroke-width="2"/>'),
  create() {
    const cells = [];
    const el = h('div.word');
    WORD_ROWS.forEach((row) => {
      [...row].forEach((ch) => {
        const cell = h('span', {}, ch);
        cells.push(cell);
        el.append(cell);
      });
    });
    const light = (key) => {
      const [r, c, len] = W[key];
      for (let i = 0; i < len; i++) cells[r * 11 + c + i].classList.add('on');
    };
    let lastKey = '';

    return {
      el,
      update({ parts, settings }) {
        const step = Math.round(parts.minute / 5) % 12;
        const bump = parts.minute >= 33 ? 1 : 0;  // "to" the next hour
        const key = `${step}|${(parts.hour + bump) % 12}|${settings.showAmPm}|${parts.hour < 12}`;
        if (key === lastKey) return;
        lastKey = key;
        cells.forEach((c) => c.classList.remove('on'));
        light('IT'); light('IS');
        const words = [
          [], ['FIVE_M', 'PAST'], ['TEN_M', 'PAST'], ['A', 'QUARTER', 'PAST'],
          ['TWENTY', 'PAST'], ['TWENTY', 'FIVE_M', 'PAST'], ['HALF', 'PAST'],
          ['TWENTY', 'FIVE_M', 'TO'], ['TWENTY', 'TO'], ['A', 'QUARTER', 'TO'],
          ['TEN_M', 'TO'], ['FIVE_M', 'TO'],
        ][step];
        words.forEach(light);
        light(HOUR_KEY[(parts.hour + bump) % 12]);
        if (step === 0) light('OCLOCK');
        if (settings.showAmPm) light(parts.hour < 12 ? 'AM' : 'PM');
      },
    };
  },
};

/* ============================== 6. BINARY ============================== */

const binaryFace = {
  id: 'binary',
  label: 'Binary',
  thumb: svg('<circle cx="6" cy="8" r="1.8" fill="currentColor" stroke="none"/><circle cx="6" cy="14" r="1.8"/><circle cx="12" cy="8" r="1.8"/><circle cx="12" cy="14" r="1.8" fill="currentColor" stroke="none"/><circle cx="18" cy="8" r="1.8" fill="currentColor" stroke="none"/><circle cx="18" cy="14" r="1.8"/>'),
  create() {
    // every column is 4 slots tall so the whole grid lines up; unused high
    // bits are rendered as invisible spacers
    const cols = [
      { bits: 2, cls: 'h' }, { bits: 4, cls: 'h' },
      { bits: 3, cls: 'm' }, { bits: 4, cls: 'm' },
      { bits: 3, cls: 's' }, { bits: 4, cls: 's' },
    ].map(({ bits, cls }) => {
      const val = h('div.val', {}, '0');
      const dots = [];
      const slots = [3, 2, 1, 0].map((bit) => {
        if (bit >= bits) return h('div.bit.spacer');
        const dot = h('div.bit');
        dots[bit] = dot;
        return dot;
      });
      return { col: h(`div.col.${cls}`, {}, val, ...slots), dots, val };
    });

    const labels = h('div.binary-labels', {},
      h('span', {}, t('HOURS')), h('span', {}, t('MINUTES')), h('span', {}, t('SECONDS')));
    const grid = h('div.binary-grid', {}, ...cols.map((c) => c.col));
    const el = h('div.binary', {}, grid, labels);

    return {
      el,
      update({ parts, settings }) {
        const hour = settings.hour24 ? parts.hour : to12(parts.hour);
        const digits = [
          Math.floor(hour / 10), hour % 10,
          Math.floor(parts.minute / 10), parts.minute % 10,
          Math.floor(parts.second / 10), parts.second % 10,
        ];
        cols.forEach((c, i) => {
          const d = digits[i];
          c.dots.forEach((dot, b) => dot.classList.toggle('on', Boolean((d >> b) & 1)));
          c.val.textContent = d;
          c.col.classList.toggle('hidden', i >= 4 && !settings.showSeconds);
        });
        labels.lastChild.classList.toggle('hidden', !settings.showSeconds);
      },
    };
  },
};

export const FACES = [flipFace, digitalFace, analogFace, ringFace, wordFace, binaryFace];
export const getFace = (id) => FACES.find((f) => f.id === id) || FACES[0];
