/* ---------------------------------------------------------------
   Settings drawer. Five tabs, each returning declarative sections
   built from the control library at the top of this file.
   Rarely-used options live inside a "More options" disclosure so the
   default view stays short.
   --------------------------------------------------------------- */
import { $, h, svg, getPath, patchFor, uid, toast, formatDate, DATE_FORMAT_IDS, COMMON_ZONES } from './util.js';
import { FACES } from './faces.js';
import { CLOCK_FONTS, WEIGHTS, getFont } from './fonts.js';
import { parseSpotifyUri } from './spotify.js';
import { Stopwatch } from './tools.js';
import { t, LANGUAGES, localeFor } from './i18n.js';

export const THEMES = [
  { id: 'obsidian', label: 'Obsidian', mode: 'dark', dots: ['#ffffff', '#6b6f7d', '#3b3e49'], bg: 'radial-gradient(120% 120% at 50% 0%, #14151a, #000 70%)' },
  { id: 'midnight', label: 'Midnight', mode: 'dark', dots: ['#7ad6ff', '#9b7bff', '#46e3c0'], bg: 'radial-gradient(120% 120% at 20% 10%, #202544, #10121e 55%, #07080f)' },
  { id: 'nord', label: 'Nord', mode: 'dark', dots: ['#88c0d0', '#81a1c1', '#a3be8c'], bg: 'radial-gradient(120% 120% at 25% 8%, #3b4252, #2e3440 55%, #21252e)' },
  { id: 'dracula', label: 'Dracula', mode: 'dark', dots: ['#bd93f9', '#ff79c6', '#50fa7b'], bg: 'radial-gradient(120% 120% at 20% 10%, #423a5e, #282a36 55%, #1b1c25)' },
  { id: 'tokyo', label: 'Tokyo', mode: 'dark', dots: ['#7aa2f7', '#bb9af7', '#7dcfff'], bg: 'radial-gradient(120% 120% at 22% 6%, #2b304a, #1a1b26 58%, #101119)' },
  { id: 'catppuccin', label: 'Catppuccin', mode: 'dark', dots: ['#f5c2e7', '#cba6f7', '#94e2d5'], bg: 'radial-gradient(120% 120% at 20% 8%, #40405c, #1e1e2e 58%, #14141f)' },
  { id: 'sunset', label: 'Sunset', mode: 'dark', dots: ['#ff9d6b', '#ff5f7e', '#ffd166'], bg: 'radial-gradient(120% 120% at 18% 8%, #6b2f45, #2e1626 55%, #170b13)' },
  { id: 'forest', label: 'Forest', mode: 'dark', dots: ['#7fd48f', '#3fa88a', '#d9e77a'], bg: 'radial-gradient(120% 120% at 20% 8%, #24402f, #12211a 58%, #0a1310)' },
  { id: 'ocean', label: 'Ocean', mode: 'dark', dots: ['#4fc3f7', '#2f80ed', '#56e0c8'], bg: 'radial-gradient(120% 120% at 22% 6%, #17415e, #0b2233 58%, #06131d)' },
  { id: 'sakura', label: 'Sakura', mode: 'dark', dots: ['#ff9ec4', '#c78bff', '#ffd6e6'], bg: 'radial-gradient(120% 120% at 20% 10%, #5b2c46, #2b1522 58%, #180c13)' },
  { id: 'cyber', label: 'Cyber', mode: 'dark', dots: ['#00f0ff', '#ff2fb9', '#b6ff3b'], bg: 'radial-gradient(120% 120% at 24% 8%, #10304a, #061019 60%, #02060a)' },
  { id: 'mocha', label: 'Mocha', mode: 'dark', dots: ['#e0a878', '#c98474', '#dfd0a8'], bg: 'radial-gradient(120% 120% at 20% 8%, #4a382c, #241a15 58%, #150f0c)' },
  { id: 'paper', label: 'Paper', mode: 'light', dots: ['#2f6bff', '#7a5cff', '#14a37f'], bg: 'radial-gradient(120% 120% at 20% 8%, #ffffff, #eceef6 55%, #dfe3ef)' },
  { id: 'linen', label: 'Linen', mode: 'light', dots: ['#c2703d', '#7f8f5a', '#4d7ea8'], bg: 'radial-gradient(120% 120% at 22% 8%, #fdfaf4, #f0e9dc 55%, #e2d9c8)' },
  { id: 'daylight', label: 'Daylight', mode: 'light', dots: ['#0a84ff', '#34c0e8', '#ffb340'], bg: 'radial-gradient(120% 120% at 20% 6%, #dcefff, #b9dcff 50%, #8fc4f5)' },
  { id: 'custom', label: 'Custom', mode: 'dark', dots: ['#ff5f57', '#febc2e', '#28c840'], bg: 'conic-gradient(from 210deg, #ff5f57, #febc2e, #28c840, #4fc3f7, #bd93f9, #ff5f57)' },
];

const ICON = {
  trash: svg('<path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13"/>'),
};

/* ---------------------------- control library ---------------------------- */

export function makeControls(app) {
  const val = (path) => getPath(app.s, path);
  const put = (path, value, opts) => app.set(patchFor(path, value), opts);

  const row = (label, sub, ...ctrl) =>
    h('div.row', {}, h('div.lbl', {}, h('b', {}, label), sub ? h('small', {}, sub) : null), ...ctrl);

  const toggle = (path, label, sub, opts = {}) => {
    const btn = h('button.sw', { role: 'switch', 'aria-checked': String(!!val(path)), 'aria-label': label });
    btn.onclick = () => {
      const next = !val(path);
      btn.setAttribute('aria-checked', String(next));
      put(path, next, opts);
    };
    return row(label, sub, btn);
  };

  const slider = (path, label, sub, { min = 0, max = 100, step = 1, scale = 1, fmt = (v) => v } = {}) => {
    const out = h('span.val', {}, fmt(val(path)));
    const input = h('input', { type: 'range', min, max, step, value: val(path) * scale, 'aria-label': label });
    input.oninput = () => {
      const v = Number(input.value) / scale;
      out.textContent = fmt(v);
      put(path, v);
    };
    return row(label, sub, h('div.slider', {}, input, out));
  };

  const select = (path, label, sub, options, opts = {}) => {
    const sel = h('select.sel', { 'aria-label': label });
    options.forEach(([v, text]) => sel.append(h('option', { value: v, selected: String(val(path)) === String(v) }, text)));
    sel.onchange = () => put(path, sel.value, opts);
    return row(label, sub, sel);
  };

  const text = (path, label, sub, { placeholder = '', list = null, onCommit } = {}) => {
    const input = h('input.txt', { type: 'text', placeholder, value: val(path) ?? '', list });
    const commit = () => { put(path, input.value.trim()); onCommit?.(input.value.trim()); };
    input.onchange = commit;
    input.onkeydown = (e) => { if (e.key === 'Enter') { commit(); input.blur(); } };
    return h('div.row.col', {}, h('div.lbl', {}, h('b', {}, label), sub ? h('small', {}, sub) : null), input);
  };

  const color = (path, label, opts = {}) => {
    const input = h('input.swatch', { type: 'color', value: val(path) || '#000000', 'aria-label': label });
    input.oninput = () => put(path, input.value, opts);
    return row(label, '', input);
  };

  const button = (label, onclick, cls = '') => h(`button.btn${cls ? `.${cls}` : ''}`, { onclick }, label);
  const inset = (...nodes) => h('div.inset', {}, ...nodes.flat().filter(Boolean));
  const group = (title, ...nodes) => h('div.group', {}, title ? h('h4', {}, title) : null, ...nodes.flat().filter(Boolean));
  const more = (...nodes) => h('details.more', {}, h('summary', {}, t('More options')), ...nodes.flat().filter(Boolean));
  const hint = (msg) => h('p.hint', {}, msg);

  return { row, toggle, slider, select, text, color, button, inset, group, more, hint, val, put };
}

const pct = (v) => `${Math.round(v * 100)}%`;

/* --------------------------------- tabs --------------------------------- */

function tabClock(app, c) {
  const grid = h('div.face-grid', {}, ...FACES.map((f) =>
    h('button.face-card', {
      class: app.s.face === f.id ? 'active' : '',
      onclick: () => { app.set({ face: f.id }); app.panel.render(); },
    }, h('div.thumb', { html: f.thumb }), h('span', {}, f.label))));

  const dateLocale = app.s.locale || localeFor();
  const isFlip = app.s.face === 'flip';

  // installed families feed the datalist behind the custom font field
  const fontList = h('datalist', { id: 'system-fonts' },
    ...(app.systemFonts || []).slice(0, 900).map((f) => h('option', { value: f })));

  return [
    c.group(t('Clock face'), grid),

    c.group(t('Display'), c.inset(
      c.toggle('hour24', t('24-hour time'), t('Turn off for 12-hour AM/PM'), { rerender: true }),
      !app.s.hour24 ? c.toggle('showAmPm', t('Show AM/PM')) : null,
      c.toggle('showSeconds', t('Show seconds')),
      c.toggle('showDate', t('Show date'), '', { rerender: true }),
    )),

    c.group(t('Typeface'), c.inset(
      c.select('clockFont', t('Clock font'), getFont(app.s.clockFont).note,
        CLOCK_FONTS.map((f) => [f.id, f.label]), { rerender: true }),
      app.s.clockFont === 'custom'
        ? c.text('clockFontCustom', t('Custom font'), t('Type any font installed on this machine'),
          { placeholder: 'Helvetica Neue', list: 'system-fonts' })
        : null,
      c.select('clockWeight', t('Weight'), '', WEIGHTS.map(([v, label]) => [v, t(label)])),
      c.slider('fontScale', t('Clock size'), '', { min: 40, max: 200, step: 5, scale: 100, fmt: pct }),
    ), fontList),

    c.more(c.inset(
      isFlip
        ? c.toggle('flipSeparator', t('Separator between cards'), t('Classic Fliqlo has none'))
        : c.toggle('blinkColon', t('Blinking colon')),
      app.s.face === 'analog' ? c.toggle('analogNumbers', t('Numbers on the dial')) : null,
      app.s.showDate ? c.select('dateFormat', t('Date format'), '',
        DATE_FORMAT_IDS.map((f) => [f, formatDate(new Date(), { format: f, locale: dateLocale })]), { rerender: true }) : null,
      app.s.showDate ? c.select('locale', t('Date language'), '', [
        ['', t('Same as app language')], ['en-US', 'English (US)'], ['en-GB', 'English (UK)'],
        ['vi-VN', 'Tiếng Việt'], ['ja-JP', '日本語'], ['ko-KR', '한국어'], ['zh-CN', '中文'],
        ['fr-FR', 'Français'], ['de-DE', 'Deutsch'], ['es-ES', 'Español'],
      ], { rerender: true }) : null,
      c.select('timezone', t('Clock time zone'), '',
        [['', t('System default')], ...COMMON_ZONES.map(([tz, name]) => [tz, `${t(name)} · ${tz}`])]),
      c.toggle('burnInShift', t('Burn-in shift'), t('Drifts the clock slightly each minute to protect OLED panels')),
    )),
  ];
}

function tabLook(app, c) {
  const grid = h('div.theme-grid', {}, ...THEMES.map((theme) =>
    h('button.theme-swatch', {
      class: app.s.theme === theme.id ? 'active' : '',
      title: theme.label,
      onclick: () => { app.set({ theme: theme.id }); app.panel.render(); },
    },
    h('i', { style: { background: theme.bg } }),
    h('div.dots', {}, ...theme.dots.map((d) => h('b', { style: { background: d } }))),
    h('em', {}, t(theme.label)))));

  const custom = app.s.theme === 'custom' ? [
    c.group(t('Your colours'), c.inset(
      c.select('customTheme.mode', t('Appearance'), '',
        [['dark', t('Dark')], ['light', t('Light')]], { rerender: true }),
      c.color('customTheme.accent', t('Accent')),
      c.color('customTheme.accent2', t('Secondary accent')),
      c.color('customTheme.fg', t('Text')),
      c.color('customTheme.bg1', t('Background top')),
      c.color('customTheme.bg2', t('Background bottom')),
      c.color('customTheme.card1', t('Card top')),
      c.color('customTheme.card2', t('Card bottom')),
      c.color('customTheme.cardFg', t('Card digits')),
    ),
    h('div.btn-row', { style: { marginTop: '2px' } },
      c.button(t('Copy from current look'), () => { app.seedCustomTheme(); app.panel.render(); }))),
  ] : [];

  const bg = app.s.background;
  const bgExtras = [];
  if (bg.type === 'image') {
    bgExtras.push(h('div.row', {},
      h('div.lbl', {}, h('b', {}, t('Wallpaper')),
        h('small', {}, bg.value ? bg.value.split(/[\\/]/).pop() : t('No image chosen'))),
      c.button(t('Choose image…'), async () => {
        const p = await window.api.app.pickImage();
        if (p) { app.set({ background: { value: p } }); app.panel.render(); }
      }, 'primary')));
  }
  if (bg.type === 'gradient') {
    bgExtras.push(c.text('background.value', t('CSS gradient'), 'linear-gradient(135deg,#1f2b5b,#0b0d16)',
      { placeholder: 'linear-gradient(...)' }));
  }

  return [
    c.group(t('Themes'), grid),
    ...custom,
    c.group(t('Liquid glass'), c.inset(
      c.toggle('glass', t('Glass effect'), t('Blurs and refracts what is behind the panels'), { rerender: true }),
      c.toggle('accentGlow', t('Accent glow on edges')),
    )),
    c.group(t('Background'), c.inset(
      c.select('background.type', t('Background source'), '', [
        ['theme', t('From the theme')], ['gradient', t('Custom gradient')],
        ['image', t('Image from disk')], ['youtube', t('YouTube video')],
      ], { rerender: true }),
      ...bgExtras,
    ),
    bg.type === 'youtube' ? c.hint(t('Turn on "Video as wallpaper" in the Music tab and the playing video becomes the background.')) : null),
    c.more(c.inset(
      app.s.glass ? c.slider('glassStrength', t('Glass blur'), '', { min: 0, max: 40, step: 1, fmt: (v) => `${v}px` }) : null,
      app.s.glass ? c.toggle('liquid', t('Liquid ripple'), t('Adds a moving distortion to the glass')) : null,
      app.supportsAcrylic ? c.toggle('acrylic', t('Window glass backdrop'), t('Use the Windows 11 acrylic material')) : null,
      c.toggle('aurora', t('Drifting colour blobs')),
      c.slider('background.dim', t('Darken background'), '', { min: 0, max: 90, step: 5, scale: 100, fmt: pct }),
      c.slider('background.blur', t('Blur background'), '', { min: 0, max: 40, step: 1, fmt: (v) => `${v}px` }),
    )),
  ];
}

function tabMusic(app, c) {
  const nodes = [
    c.group(t('Music source'), c.inset(
      c.select('player', t('Player'), '', [
        ['none', t('Off')], ['spotify', 'Spotify'], ['youtube', 'YouTube'],
      ], { rerender: true }))),
  ];

  if (app.s.player === 'spotify') {
    const st = app.spotifyStatus || {};
    const connected = st.connected;
    const redirect = st.redirectUri || 'http://127.0.0.1:8888/callback';

    nodes.push(c.group('Spotify',
      c.inset(
        h('div.row', {},
          h('div.lbl', {}, h('b', {}, t('Status')),
            h('small', {}, connected ? t('Account connected') : t('Not connected'))),
          h('span', { class: `badge ${connected ? 'ok' : 'off'}` }, connected ? 'Online' : 'Offline')),
        c.text('spotify.clientId', t('Client ID'), t('Stored on this machine only, never sent anywhere else'),
          { placeholder: '3f8b…' }),
        h('div.row', {},
          h('div.lbl', {}, h('b', {}, connected ? t('Reconnect') : t('Connect account')),
            h('small', {}, t('Your browser will open so you can sign in to Spotify'))),
          h('div.btn-row', {},
            c.button(connected ? t('Reconnect') : t('Connect'), () => app.connectSpotify(), 'primary'),
            connected ? c.button(t('Disconnect'), async () => {
              await window.api.spotify.logout();
              app.spotifyStatus = await window.api.spotify.status();
              app.panel.render();
              toast(t('Spotify disconnected'));
            }, 'danger') : null)),
      ),
      !connected ? h('ol.steps', {},
        h('li', { html: t('Open {link} and create an app (it is free).', { link: '<a class="link" data-ext="https://developer.spotify.com/dashboard">developer.spotify.com/dashboard</a>' }) }),
        h('li', { html: t('Under Redirect URIs add exactly: {uri}', { uri: `<code>${redirect}</code>` }) }),
        h('li', { html: t('Tick {api}, save, then copy the {id} into the field below.', { api: '<code>Web API</code>', id: '<b>Client ID</b>' }) }),
      ) : null,
    ));

    if (connected) {
      const uriInput = h('input.txt', { type: 'text', placeholder: t('Paste a Spotify track or playlist link…') });
      nodes.push(c.group(t('Playback'),
        c.inset(
          h('div.row.col', {},
            h('div.lbl', {}, h('b', {}, t('Play from a link')), h('small', {}, 'open.spotify.com/… · spotify:playlist:…')),
            uriInput,
            h('div.btn-row', {},
              c.button(t('Play'), () => {
                if (!parseSpotifyUri(uriInput.value)) return toast(t('Invalid Spotify link'), 'err');
                app.spotify.playUri(uriInput.value);
              }, 'primary'),
              c.button(t('Open Spotify'), () => window.api.app.openExternal('https://open.spotify.com')))),
          h('div.row', {},
            h('div.lbl', {}, h('b', {}, t('Playback device')),
              h('small', {}, app.spotify.state.device || t('No active device'))),
            c.button(t('Refresh'), async () => {
              const devices = await app.spotify.devices();
              if (!devices.length) return toast(t('No device found. Open the Spotify app.'), 'err', 4000);
              app.panel.deviceList = devices;
              app.panel.render();
            }))),
        app.panel.deviceList?.length ? h('div.list', {}, ...app.panel.deviceList.map((d) =>
          h('div.list-item', {},
            h('div.grow', {}, h('b', {}, d.name), h('small', {}, `${d.type}${d.is_active ? ` · ${t('active')}` : ''}`)),
            c.button(d.is_active ? t('In use') : t('Switch'), () => app.spotify.transfer(d.id))))) : null,
        c.hint(t('Play/pause control needs Spotify Premium. Free accounts can still see what is playing.')),
      ));
    }
  }

  if (app.s.player === 'youtube') {
    const urlInput = h('input.txt', { type: 'text', placeholder: 'https://www.youtube.com/watch?v=…', value: app.s.youtube.lastUrl || '' });
    const playUrl = async () => {
      const url = urlInput.value.trim();
      if (!url) return;
      app.set({ youtube: { lastUrl: url } });
      const ok = await app.youtube.load(url, { volume: app.s.youtube.volume, loop: app.s.youtube.loop });
      if (ok) { app.youtube.play(); app.showPlayerBar(); }
    };
    urlInput.onkeydown = (e) => { if (e.key === 'Enter') playUrl(); };

    nodes.push(c.group('YouTube',
      c.inset(
        h('div.row.col', {},
          h('div.lbl', {}, h('b', {}, t('Video or playlist link')), h('small', {}, t('Supports youtu.be, /watch?v=, /playlist?list='))),
          urlInput,
          h('div.btn-row', {},
            c.button(t('Play'), playUrl, 'primary'),
            c.button(t('Stop'), () => app.youtube.stop()))),
        c.toggle('youtube.videoAsBackground', t('Video as wallpaper'), t('Turns the playing video into a live background')),
        c.slider('youtube.volume', t('Volume'), '', { min: 0, max: 100, step: 1, fmt: (v) => `${v}%` }),
        c.toggle('youtube.loop', t('Repeat when finished')),
      ),
      c.hint(t('Some videos block embedding and will not play — try another link.')),
    ));
  }

  return nodes;
}

function tabTools(app, c) {
  const p = app.s.pomodoro;
  const DAYS = [t('Sun'), t('Mon'), t('Tue'), t('Wed'), t('Thu'), t('Fri'), t('Sat')];

  /* --- alarms --- */
  const draft = { days: [] };
  const timeInput = h('input.txt', { type: 'time', value: '07:00' });
  const labelInput = h('input.txt', { type: 'text', placeholder: t('Label (optional)') });
  const dayBtns = DAYS.map((d, i) => {
    const b = h('button.btn', {}, d);
    b.style.padding = '6px 9px';
    b.onclick = () => {
      const on = draft.days.includes(i);
      draft.days = on ? draft.days.filter((x) => x !== i) : [...draft.days, i];
      b.classList.toggle('primary', !on);
    };
    return b;
  });

  const alarmList = (app.s.alarms || []).length
    ? h('div.list', {}, ...app.s.alarms.map((a) => h('div.list-item', {},
        h('div.grow', {}, h('b', {}, a.time),
          h('small', {}, [a.label, a.days?.length ? [...a.days].sort().map((d) => DAYS[d]).join(' ') : t('Every day')]
            .filter(Boolean).join(' · '))),
        (() => {
          const sw = h('button.sw', { role: 'switch', 'aria-checked': String(!!a.enabled) });
          sw.onclick = () => {
            app.set({ alarms: app.s.alarms.map((x) => (x.id === a.id ? { ...x, enabled: !x.enabled } : x)) });
            sw.setAttribute('aria-checked', String(!a.enabled));
            a.enabled = !a.enabled;
          };
          return sw;
        })(),
        h('button.icon-btn', {
          html: ICON.trash,
          title: t('Delete'),
          onclick: () => { app.set({ alarms: app.s.alarms.filter((x) => x.id !== a.id) }); app.panel.render(); },
        }))))
    : h('div.empty', {}, t('No alarms yet'));

  const sw = app.stopwatch;
  const swDisplay = h('b', { style: { fontSize: '19px' } }, sw.display);
  app.panel.stopwatchNode = swDisplay;

  const zoneSel = h('select.sel', { style: { maxWidth: '100%', flex: '1', minWidth: '0' } },
    ...COMMON_ZONES.map(([tz, name]) => h('option', { value: tz }, `${t(name)} · ${tz}`)));

  return [
    c.group(t('Focus'), c.inset(
      h('div.row', {},
        h('div.lbl', {}, h('b', {}, t('Pomodoro')),
          h('small', {}, t('{work} min work · {short} min break · long break every {rounds} rounds',
            { work: p.work, short: p.short, rounds: p.rounds }))),
        c.button(t('Start'), () => { app.focus.startPomodoro(); app.panel.close(); }, 'primary')),
      h('div.row', {},
        h('div.lbl', {}, h('b', {}, t('Countdown')), h('small', {}, t('Shows in the bottom-right corner'))),
        h('div.btn-row', {}, ...[5, 15, 25, 45].map((m) =>
          c.button(`${m}′`, () => { app.focus.countdown(m); app.panel.close(); })))),
    ),
    c.more(c.inset(
      c.slider('pomodoro.work', t('Focus length'), '', { min: 5, max: 90, step: 5, fmt: (v) => `${v}′` }),
      c.slider('pomodoro.short', t('Short break'), '', { min: 1, max: 30, step: 1, fmt: (v) => `${v}′` }),
      c.slider('pomodoro.long', t('Long break'), '', { min: 5, max: 60, step: 5, fmt: (v) => `${v}′` }),
      c.slider('pomodoro.rounds', t('Rounds before a long break'), '', { min: 2, max: 8, step: 1 }),
      c.toggle('pomodoro.autoStart', t('Roll straight into the next session')),
      c.toggle('pomodoro.sound', t('Chime when time is up')),
    ))),

    c.group(t('Alarms'),
      alarmList,
      c.inset(h('div.row.col', {},
        h('div.lbl', {}, h('b', {}, t('Add an alarm'))),
        h('div.btn-row', {}, timeInput, labelInput),
        h('div.btn-row', {}, ...dayBtns),
        h('div.btn-row', {}, c.button(t('Add'), () => {
          app.set({
            alarms: [...(app.s.alarms || []), {
              id: uid(), time: timeInput.value || '07:00', label: labelInput.value.trim(),
              days: [...draft.days], enabled: true,
            }],
          });
          app.panel.render();
          toast(t('Alarm added'));
        }, 'primary'))),
      c.slider('soundVolume', t('Chime volume'), '', { min: 0, max: 100, step: 5, scale: 100, fmt: pct }))),

    c.group(t('Stopwatch'), c.inset(
      h('div.row', {},
        h('div.lbl', {}, swDisplay, h('small', {}, t('{n} laps recorded', { n: sw.laps.length }))),
        h('div.btn-row', {},
          c.button(sw.running ? t('Pause') : t('Run'), () => { sw.toggle(); app.panel.render(); }, 'primary'),
          c.button(t('Lap'), () => { sw.lap(); app.panel.render(); }),
          c.button(t('Clear'), () => { sw.reset(); app.panel.render(); }))),
      ...sw.laps.slice(0, 5).map((l, i) =>
        h('div.row', {}, h('div.lbl', {}, h('b', {}, t('Lap {n}', { n: sw.laps.length - i }))),
          h('span.val', {}, Stopwatch.format(l)))),
    )),

    c.group(t('World clocks'),
      (app.s.worldClocks || []).length
        ? h('div.list', {}, ...app.s.worldClocks.map((w) => h('div.list-item', {},
            h('div.grow', {}, h('b', {}, t(w.label)), h('small', {}, w.tz)),
            h('button.icon-btn', {
              html: ICON.trash,
              title: t('Delete'),
              onclick: () => { app.set({ worldClocks: app.s.worldClocks.filter((x) => x.tz !== w.tz) }); app.panel.render(); },
            }))))
        : h('div.empty', {}, t('Add a time zone to show it under the clock')),
      c.inset(h('div.row', {}, zoneSel, c.button(t('Add'), () => {
        const tz = zoneSel.value;
        if ((app.s.worldClocks || []).some((w) => w.tz === tz)) return toast(t('This time zone is already listed'));
        const label = COMMON_ZONES.find(([z]) => z === tz)?.[1] || tz;
        app.set({ worldClocks: [...(app.s.worldClocks || []), { tz, label }] });
        app.panel.render();
      }, 'primary')))),
  ];
}

function tabSystem(app, c) {
  const hk = app.s.hotkeys;
  const info = app.appInfo || {};
  const hotkeyRow = (path, label) => {
    const input = h('input.txt.small', { type: 'text', value: getPath(app.s, path) || '', placeholder: 'Alt+Shift+C' });
    input.onchange = () => app.set(patchFor(path, input.value.trim()));
    return h('div.row', {}, h('div.lbl', {}, h('b', {}, label)), input);
  };
  const keys = [
    ['Space', t('Play / pause music')], ['F', t('Full screen')], ['S', t('Open settings')],
    ['T', t('Next theme')], ['C', t('Next clock face')], ['Esc', t('Close panel / leave full screen')],
  ];

  return [
    c.group(t('General'), c.inset(
      c.select('language', t('App language'), '', LANGUAGES, { rerender: true }),
      c.slider('uiScale', t('Interface size'), '', { min: 80, max: 140, step: 5, scale: 100, fmt: pct }),
    )),

    c.group(t('Window'), c.inset(
      c.toggle('alwaysOnTop', t('Keep on top')),
      c.toggle('autoHideUI', t('Auto-hide the controls'), t('Hides the dock when the mouse rests')),
      c.slider('opacity', t('Window opacity'), '', { min: 20, max: 100, step: 5, scale: 100, fmt: pct }),
    )),

    c.group(t('Startup'), c.inset(
      c.toggle('launchAtLogin', t('Launch with Windows')),
      c.toggle('startMinimizedToTray', t('Start hidden in the tray')),
    )),

    c.more(
      c.inset(
        c.toggle('clickThrough', t('Let clicks pass through'),
          t('Turns the clock into an overlay. Use a hotkey to turn it back off.')),
        c.toggle('hideOnBlur', t('Hide when it loses focus')),
        c.toggle('keepAwake', t('Keep the display awake')),
        c.toggle('nightDim.enabled', t('Dim automatically at night'), '', { rerender: true }),
        app.s.nightDim.enabled ? h('div.row', {},
          h('div.lbl', {}, h('b', {}, t('Between'))),
          (() => {
            const from = h('input.txt', { type: 'time', value: app.s.nightDim.from });
            const to = h('input.txt', { type: 'time', value: app.s.nightDim.to });
            from.onchange = () => app.set({ nightDim: { from: from.value } });
            to.onchange = () => app.set({ nightDim: { to: to.value } });
            return h('div.btn-row', {}, from, to);
          })()) : null,
        app.s.nightDim.enabled ? c.slider('nightDim.opacity', t('Night brightness'), '',
          { min: 15, max: 100, step: 5, scale: 100, fmt: pct }) : null,
        c.toggle('hotkeys.enabled', t('Global hotkeys'), '', { rerender: true }),
        hk.enabled ? hotkeyRow('hotkeys.toggleWindow', t('Show / hide the clock')) : null,
        hk.enabled ? hotkeyRow('hotkeys.fullscreen', t('Full screen')) : null,
        hk.enabled ? hotkeyRow('hotkeys.playPause', t('Play / pause')) : null,
      ),
      hk.enabled ? c.hint(t('Use Electron syntax: CommandOrControl, Alt, Shift, Super + key. Leave empty to unbind.')) : null,
    ),

    c.group(t('Shortcuts'), h('div.inset', {},
      ...keys.map(([k, d]) => h('div.kbd-row', {}, h('span', {}, d), h('kbd', {}, k))))),

    c.group('Ora Clock', c.inset(
      h('div.row', {}, h('div.lbl', {}, h('b', {}, t('Version {v}', { v: info.version || '1.0.0' })),
        h('small', {}, `Electron ${info.electron || ''} · ${info.platform || ''}`))),
      h('div.row', {},
        h('div.lbl', {}, h('b', {}, t('Reset every setting')), h('small', {}, t('Keeps the Spotify connection'))),
        c.button(t('Reset'), async () => {
          if (!confirm(t('Reset all options to their defaults?'))) return;
          await app.resetSettings();
        }, 'danger')),
      h('div.row', {},
        h('div.lbl', {}, h('b', {}, t('Quit the app')), h('small', {}, t('Closing the window only hides it in the tray'))),
        c.button(t('Quit'), () => window.api.window.action('quit'))),
    )),
  ];
}

const TABS = [
  { id: 'faces', label: () => t('Clock'), render: tabClock },
  { id: 'themes', label: () => t('Look'), render: tabLook },
  { id: 'music', label: () => t('Music'), render: tabMusic },
  { id: 'tools', label: () => t('Tools'), render: tabTools },
  { id: 'settings', label: () => t('System'), render: tabSystem },
];

export const TAB_IDS = TABS.map((tab) => tab.id);

/* --------------------------------- panel --------------------------------- */

export class Panel {
  constructor(app) {
    this.app = app;
    this.active = TABS.some((tab) => tab.id === app.s.panelTab) ? app.s.panelTab : 'faces';
    this.el = $('#panel');
    this.body = $('#panel-body');
    this.tabsEl = $('#panel-tabs');
    this.deviceList = null;

    $('#panel-close').onclick = () => this.close();
    $('#scrim').onclick = () => this.close();
    this.buildTabs();
  }

  buildTabs() {
    this.tabsEl.replaceChildren(...TABS.map((tab) =>
      h('button', { onclick: () => this.open(tab.id) }, tab.label())));
  }

  get isOpen() { return document.body.classList.contains('panel-open'); }

  open(tab) {
    if (tab && tab !== this.active) {
      this.active = tab;
      this.app.set({ panelTab: tab });
      this.body.scrollTop = 0;
    }
    document.body.classList.add('panel-open');
    this.el.setAttribute('aria-hidden', 'false');
    this.render();
  }

  close() {
    document.body.classList.remove('panel-open');
    this.el.setAttribute('aria-hidden', 'true');
    this.app.syncDock();
  }

  toggle(tab) {
    if (this.isOpen && (!tab || tab === this.active)) this.close();
    else this.open(tab);
  }

  render() {
    if (!this.isOpen) return;
    const c = makeControls(this.app);
    const def = TABS.find((tab) => tab.id === this.active) || TABS[0];
    const scroll = this.body.scrollTop;
    this.buildTabs();
    [...this.tabsEl.children].forEach((b, i) => b.classList.toggle('active', TABS[i].id === this.active));
    this.body.replaceChildren(...def.render(this.app, c).filter(Boolean));
    this.body.scrollTop = scroll;
    this.body.querySelectorAll('[data-ext]').forEach((a) => {
      a.onclick = (e) => { e.preventDefault(); window.api.app.openExternal(a.dataset.ext); };
    });
    this.app.syncDock();
  }
}
