/* ---------------------------------------------------------------
   Ora Clock — renderer entry point.
   Owns settings state, the render loop, and wires every module up.
   --------------------------------------------------------------- */
import { $, $$, h, clamp, pad, zonedParts, formatDate, toast, chime, hhmmToMinutes } from './util.js';
import { getFace, FACES } from './faces.js';
import { Panel, THEMES, TAB_IDS } from './panel.js';
import { SpotifyPlayer } from './spotify.js';
import { YouTubePlayer } from './youtube.js';
import { FocusTimer, AlarmEngine, Stopwatch } from './tools.js';
import { t, setLanguage, localeFor } from './i18n.js';
import { fontStack, CLOCK_FONTS } from './fonts.js';

const REF_SIZE = 100;   // faces are measured at this size, then scaled to fit

class App {
  constructor() {
    this.s = null;
    this.face = null;
    this.faceHost = $('#clock-host');
    this.stage = $('#stage');
    this.uiTimer = null;
    this.lastMinute = -1;
    this.shiftAt = 0;
  }

  async boot() {
    // running in a plain browser (design preview) → install the stub bridge
    if (!window.api) await import('./dev-shim.js');
    this.s = await window.api.settings.get();
    setLanguage(this.s.language);
    this.appInfo = await window.api.app.info();
    const winState = await window.api.window.state();
    document.body.classList.toggle('squared', winState.maximized || winState.fullscreen);

    this.stopwatch = new Stopwatch();
    this.focus = new FocusTimer(this.s, () => this.renderFocus());
    this.alarms = new AlarmEngine(this.s, (a) => this.fireAlarm(a));
    this.spotify = new SpotifyPlayer(() => this.renderPlayer());
    this.youtube = new YouTubePlayer(() => this.renderPlayer());
    this.panel = new Panel(this);

    this.bindUI();
    this.applyStaticLabels();
    this.apply();
    this.mountFace();
    this.loop();
    this.slowLoop();

    // installed families for the custom-font field; slow on some machines, so late and optional
    window.api.app.fonts?.().then((list) => { this.systemFonts = list || []; }).catch(() => {});

    this.spotifyStatus = await window.api.spotify.status();
    if (this.s.player === 'spotify') this.startSpotify();
    if (this.s.player === 'youtube' && this.s.youtube.lastUrl) {
      this.showPlayerBar();
      // restore the last link, queued but silent
      this.youtube.load(this.s.youtube.lastUrl, {
        volume: this.s.youtube.volume, loop: this.s.youtube.loop, autoplay: false,
      });
    }

    if (this.s.firstRun) {
      this.set({ firstRun: false });
      setTimeout(() => toast(t('Welcome! The gear in the top right opens the settings.'), '', 5200), 900);
    }
    document.body.classList.add('ui-visible');
    this.scheduleHideUI();

    if (new URLSearchParams(location.search).has('selftest')) setTimeout(() => this.selfTest(), 400);
  }

  /** Smoke test: render every panel tab and every face, report anything that throws. */
  selfTest() {
    const before = {
      face: this.s.face, tab: this.panel.active, player: this.s.player,
      theme: this.s.theme, clockFont: this.s.clockFont,
    };
    const errors = [];
    const attempt = (what, fn) => { try { fn(); } catch (err) { errors.push(`${what}: ${err.message}`); } };

    for (const player of ['none', 'spotify', 'youtube']) {
      attempt(`music/${player}`, () => { this.set({ player }); this.panel.open('music'); });
    }
    this.set({ player: before.player });
    for (const tab of TAB_IDS) attempt(`tab/${tab}`, () => this.panel.open(tab));
    attempt('theme/custom', () => { this.set({ theme: 'custom' }); this.panel.open('themes'); });
    for (const theme of THEMES) attempt(`theme/${theme.id}`, () => this.set({ theme: theme.id }));
    this.panel.close();
    for (const f of FACES) attempt(`face/${f.id}`, () => this.set({ face: f.id }));
    for (const font of CLOCK_FONTS) attempt(`font/${font.id}`, () => this.set({ clockFont: font.id }));

    this.set({ face: before.face, panelTab: before.tab, theme: before.theme, clockFont: before.clockFont });
    console.log(`[selftest] ${errors.length
      ? `FAIL — ${errors.join(' | ')}`
      : `ok — ${FACES.length} faces, ${TAB_IDS.length} tabs, ${THEMES.length} themes, ${CLOCK_FONTS.length} fonts`}`);
    this.responsiveTest();
  }

  /** Walks a few window sizes and reports anything that overflows or collides. */
  async responsiveTest() {
    const sizes = [[1180, 740], [980, 620], [760, 560], [620, 480], [480, 400], [380, 300]];
    // the second pass is the worst case a user can build from the settings panel
    const passes = [
      ['plain', {}],
      ['loaded', {
        fontScale: 2, showSeconds: true, showDate: true,
        worldClocks: [{ tz: 'Asia/Tokyo', label: 'Tokyo' }, { tz: 'Europe/London', label: 'London' }],
      }],
    ];
    const before = {
      fontScale: this.s.fontScale, showSeconds: this.s.showSeconds,
      showDate: this.s.showDate, worldClocks: this.s.worldClocks,
    };
    const restore = [window.innerWidth, window.innerHeight];
    const problems = [];
    const frame = () => new Promise((r) => setTimeout(r, 220));

    // show every floating piece at once — that is the worst case for collisions
    this.panel.open('faces');
    $('#player-bar').classList.remove('hidden');
    this.focus.countdown(5);
    await new Promise((r) => setTimeout(r, 560));   // let the panel finish sliding in

    for (const [pass, patch] of passes) {
      this.set(patch);
      await frame();
      for (const [w, h] of sizes) {
        await window.api.window.setSize(w, h);
        await frame();
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const where = `${pass} ${w}x${h}`;
        const fits = (el, name) => {
          const r = el.getBoundingClientRect();
          if (r.width === 0) return null;
          if (r.right > vw + 1 || r.left < -1 || r.bottom > vh + 1 || r.top < -1) {
            problems.push(`${where} ${name} outside viewport (${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}x${Math.round(r.height)})`);
          }
          return r;
        };
        if (document.documentElement.scrollWidth > vw + 1) problems.push(`${where} horizontal overflow`);
        fits($('#titlebar'), 'titlebar');
        fits($('#panel'), 'panel');
        const bar = fits($('#player-bar'), 'player bar');
        const hud = fits($('#focus-hud'), 'focus HUD');
        fits($('#clock-wrap'), 'clock');
        const clock = $('#clock-wrap').getBoundingClientRect();
        const hits = (a, b) => a && b && a.width && b.width
          && a.left < b.right - 2 && b.left < a.right - 2 && a.top < b.bottom - 2 && b.top < a.bottom - 2;
        if (hits(clock, bar)) problems.push(`${where} clock overlaps player bar`);
        if (hits(hud, bar)) problems.push(`${where} focus HUD overlaps player bar`);
      }
    }

    this.set(before);
    this.focus.stop();
    this.panel.close();
    this.renderPlayerBarVisibility();
    await window.api.window.setSize(restore[0], restore[1]);
    console.log(`[responsive] ${problems.length
      ? `FAIL — ${problems.join(' | ')}`
      : `ok — ${sizes.length} sizes x ${passes.length} passes`}`);
  }

  /* ------------------------------ settings ------------------------------ */

  /**
   * Cross-fades the page around `fn` so a look change lands as a dissolve
   * rather than a jump cut. Falls back to a plain call where the View
   * Transition API is missing or motion is turned down.
   */
  transition(fn) {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!document.startViewTransition || reduce || this._inTransition) return fn();
    this._inTransition = true;
    try {
      const vt = document.startViewTransition(() => { fn(); });
      vt.finished.catch(() => {}).finally(() => { this._inTransition = false; });
      return vt;
    } catch {
      this._inTransition = false;
      return fn();
    }
  }

  set(patch, { rerender = false, smooth = false } = {}) {
    if (smooth) return this.transition(() => this.set(patch, { rerender }));
    const prevFace = this.s.face;
    const prevLang = this.s.language;
    this.s = deepMerge(this.s, patch);
    const langChanged = this.s.language !== prevLang;
    if (langChanged) {
      setLanguage(this.s.language);
      this.applyStaticLabels();
      this.lastMinute = -1;      // re-render the date line in the new locale
    }
    this.focus.settings = this.s;
    this.alarms.settings = this.s;
    window.api.settings.set(patch);
    this.apply();
    this.refitSoon();
    if (this.s.face !== prevFace || langChanged) this.mountFace();
    if (rerender) this.panel.render();
    return this.s;
  }

  async resetSettings() {
    this.s = await window.api.settings.reset();
    setLanguage(this.s.language);
    this.focus.settings = this.s;
    this.alarms.settings = this.s;
    this.applyStaticLabels();
    this.apply();
    this.mountFace();
    this.panel.render();
    toast(t('Settings reset'));
  }

  /** Labels that live in index.html rather than in a render function. */
  applyStaticLabels() {
    const settingsBtn = $('#settings-btn');
    settingsBtn.title = `${t('Settings')} (S)`;
    settingsBtn.setAttribute('aria-label', t('Settings'));

    const titles = {
      pin: t('Keep on top'), fullscreen: t('Full screen'), minimize: t('Minimise'),
      maximize: t('Maximise'), close: t('Hide to tray'),
    };
    $$('[data-win]').forEach((b) => {
      const label = titles[b.dataset.win];
      if (!label) return;
      b.title = label;
      b.setAttribute('aria-label', label);
    });

    const player = { prev: t('Previous track'), toggle: t('Play / pause'), next: t('Next track') };
    $$('[data-pl]').forEach((b) => { b.title = player[b.dataset.pl] || b.title; });

    const pomo = { toggle: t('Start'), skip: t('Skip'), stop: t('Close') };
    $$('[data-pomo]').forEach((b) => { b.textContent = pomo[b.dataset.pomo] || b.textContent; });

    $('#panel-close').title = t('Close');
  }

  /** Push the whole settings object onto the DOM. */
  apply() {
    const s = this.s;
    const root = document.documentElement;
    const body = document.body;

    root.dataset.theme = s.theme;
    root.dataset.face = s.face;
    root.dataset.mode = s.theme === 'custom'
      ? (s.customTheme.mode || 'dark')
      : (THEMES.find((th) => th.id === s.theme)?.mode || 'dark');
    this.applyCustomTheme();
    this.applyTypography();

    body.classList.toggle('no-glass', !s.glass);
    body.classList.toggle('liquid', !!s.glass && !!s.liquid);
    body.classList.toggle('accent-glow', !!s.accentGlow);
    body.classList.toggle('no-aurora', s.aurora === false);

    root.style.setProperty('--glass-blur', `${s.glassStrength}px`);

    this.applyBackground();
    this.renderPlayerBarVisibility();
    this.resize();

    // liquid layers are per-panel children, added lazily
    $$('.glass').forEach((g) => {
      if (!g.querySelector(':scope > .liquid-layer')) g.prepend(h('div.liquid-layer'));
    });
  }

  applyTypography() {
    const root = document.documentElement;
    root.style.setProperty('--font-clock', fontStack(this.s));
    if (this.s.clockWeight) root.style.setProperty('--clock-weight', this.s.clockWeight);
    else root.style.removeProperty('--clock-weight');
  }

  /** Seeds the custom theme from whatever is on screen right now. */
  seedCustomTheme() {
    const cs = getComputedStyle(document.documentElement);
    const read = (name, fallback) => (cs.getPropertyValue(name).trim() || fallback);
    const prev = this.s.theme;
    const mode = prev === 'custom'
      ? this.s.customTheme.mode
      : (THEMES.find((th) => th.id === prev)?.mode || 'dark');
    this.set({
      customTheme: {
        mode,
        accent: toHex(read('--accent', '#7ad6ff')),
        accent2: toHex(read('--accent-2', '#9b7bff')),
        fg: toHex(read('--fg', '#eef1ff')),
        cardFg: toHex(read('--card-fg', '#dedee1')),
      },
      theme: 'custom',
    });
    toast(t('Copied into your custom theme'));
  }

  /** The "Custom" theme is just the same token set, written inline from the user's colours. */
  applyCustomTheme() {
    const root = document.documentElement;
    const vars = ['--accent', '--accent-2', '--accent-3', '--on-accent', '--fg', '--fg-dim',
      '--bg-gradient', '--card', '--card-fg'];
    if (this.s.theme !== 'custom') {
      vars.forEach((v) => root.style.removeProperty(v));
      return;
    }
    const c = this.s.customTheme;
    root.style.setProperty('--accent', c.accent);
    root.style.setProperty('--accent-2', c.accent2);
    root.style.setProperty('--accent-3', c.accent2);
    root.style.setProperty('--on-accent', luminance(c.accent) > 0.55 ? '#0a0a0c' : '#ffffff');
    root.style.setProperty('--fg', c.fg);
    root.style.setProperty('--fg-dim', `color-mix(in srgb, ${c.fg} 62%, transparent)`);
    root.style.setProperty('--bg-gradient',
      `radial-gradient(125% 125% at 20% 6%, ${c.bg1} 0%, ${c.bg2} 62%, ${c.bg2} 100%)`);
    root.style.setProperty('--card', `linear-gradient(180deg, ${c.card1} 0%, ${c.card2} 100%)`);
    root.style.setProperty('--card-fg', c.cardFg);
  }

  applyBackground() {
    const bg = this.s.background;
    const media = $('#bg-media');
    const ytHost = $('#yt-host');

    if (bg.type === 'image' && bg.value) {
      // wallpapers live outside the served folder → fetch them through /local
      const src = this.appInfo?.assetToken
        ? `/local?t=${this.appInfo.assetToken}&p=${encodeURIComponent(bg.value)}`
        : `file:///${bg.value.replace(/\\/g, '/').replace(/^\/+/, '')}`;
      media.style.backgroundImage = `url("${src}")`;
    } else if (bg.type === 'gradient' && bg.value) {
      media.style.backgroundImage = bg.value;
    } else {
      media.style.backgroundImage = 'var(--bg-gradient)';
    }

    const wantVideo = bg.type === 'youtube' && this.s.youtube.videoAsBackground && this.s.player === 'youtube';
    ytHost.classList.toggle('as-background', wantVideo);

    media.style.filter = bg.blur ? `blur(${bg.blur}px)` : '';
    document.documentElement.style.setProperty('--veil', String(bg.dim ?? 0));
  }

  /* ------------------------------- faces ------------------------------- */

  mountFace() {
    const def = getFace(this.s.face);
    this.face = def.create(this.s);
    this.faceHost.replaceChildren(this.face.el);
    this.resize();
    this.render(true);
  }

  /** Measures the mounted face at a reference size, then scales it to fill the stage. */
  resize() {
    if (!this.face) return;
    const root = document.documentElement;
    const cs = getComputedStyle(this.stage);
    const padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
    const padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
    const extra = (this.s.showDate ? 42 : 0) + ((this.s.worldClocks || []).length ? 94 : 0);
    const boxW = Math.max(60, this.stage.clientWidth - padX);
    const boxH = Math.max(60, this.stage.clientHeight - padY - extra);

    root.style.setProperty('--clock-size', `${REF_SIZE}px`);
    const r = this.face.el.getBoundingClientRect();
    const w0 = Math.max(1, r.width);
    const h0 = Math.max(1, r.height);

    // "Clock size" scales the comfortable fit, but never past the box itself —
    // otherwise 150% simply clips the face off the side of a narrow window
    const comfy = Math.min((boxW * 0.96) / w0, (boxH * 0.98) / h0);
    const hard = Math.min(boxW / w0, boxH / h0);
    const size = clamp(REF_SIZE * Math.min(comfy * (this.s.fontScale || 1), hard), 14, 620);
    root.style.setProperty('--clock-size', `${size}px`);
  }

  /** Re-fits once the face has redrawn — seconds, date and fonts all change its width. */
  refitSoon() {
    if (!this.face) return;
    cancelAnimationFrame(this._refit);
    this._refit = requestAnimationFrame(() => {
      this.render(true);      // let the face rebuild before it is measured
      this.resize();
    });
  }

  /* ------------------------------- loops ------------------------------- */

  loop() {
    const step = () => {
      this.render(false);
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  render(force) {
    const now = new Date();
    const parts = zonedParts(now, this.s.timezone);
    // faces only need repainting when the visible unit changes, except analog/ring
    const smooth = this.s.face === 'analog' || this.s.face === 'ring';
    const key = `${parts.hour}:${parts.minute}:${parts.second}`;
    if (force || smooth || key !== this._key) {
      this._key = key;
      this.face.update({ parts, date: now, settings: this.s });
    }

    if (parts.minute !== this.lastMinute) {
      this.lastMinute = parts.minute;
      this.onMinute(now, parts);
    }
  }

  onMinute(now, parts) {
    $('#date-line').textContent = this.s.showDate
      ? formatDate(now, {
        format: this.s.dateFormat,
        timezone: this.s.timezone,
        locale: this.s.locale || localeFor(),
      })
      : '';
    $('#date-line').classList.toggle('hidden', !this.s.showDate);
    this.alarms.check(parts);
    this.applyNightDim(parts);
    this.applyBurnInShift();
    this.resize();
  }

  /** 1 Hz work that does not need frame precision. */
  slowLoop() {
    setInterval(() => {
      this.focus.tick();
      this.stopwatch.tick();
      if (this.panel.stopwatchNode && this.panel.isOpen) {
        this.panel.stopwatchNode.textContent = this.stopwatch.display;
      }
      this.renderWorldClocks();
      if (this.s.player === 'spotify') { this.spotify.advance(1000); this.renderPlayer(); }
    }, 1000);
  }

  renderWorldClocks() {
    const strip = $('#world-strip');
    const list = this.s.worldClocks || [];
    if (!list.length) { strip.replaceChildren(); return; }
    const now = new Date();
    const nodes = list.map((w) => {
      const p = zonedParts(now, w.tz);
      const local = zonedParts(now, this.s.timezone);
      const diff = Math.round(((p.hour * 60 + p.minute) - (local.hour * 60 + local.minute)) / 60);
      const time = this.s.hour24
        ? `${pad(p.hour)}:${pad(p.minute)}`
        : `${((p.hour % 12) || 12)}:${pad(p.minute)} ${p.hour < 12 ? 'AM' : 'PM'}`;
      return h('div.world-chip', {}, h('b', {}, time), h('span', {}, t(w.label)),
        h('i', {}, diff === 0 ? t('same time') : `${diff > 0 ? '+' : ''}${diff}h`));
    });
    strip.replaceChildren(...nodes);
  }

  applyNightDim(parts) {
    const nd = this.s.nightDim;
    const wrap = $('#clock-wrap');
    if (!nd.enabled) { wrap.style.opacity = ''; return; }
    const now = parts.hour * 60 + parts.minute;
    const from = hhmmToMinutes(nd.from);
    const to = hhmmToMinutes(nd.to);
    const isNight = from <= to ? now >= from && now < to : now >= from || now < to;
    wrap.style.opacity = isNight ? String(nd.opacity) : '';
  }

  applyBurnInShift() {
    const wrap = $('#clock-wrap');
    if (!this.s.burnInShift) {
      wrap.style.removeProperty('--shift-x');
      wrap.style.removeProperty('--shift-y');
      return;
    }
    const t = Date.now() / 60000;
    wrap.style.setProperty('--shift-x', `${Math.sin(t / 7) * 22}px`);
    wrap.style.setProperty('--shift-y', `${Math.cos(t / 11) * 14}px`);
  }

  /* ------------------------------- alarms ------------------------------- */

  fireAlarm(a) {
    chime(this.s.soundVolume, [880, 1320, 880, 1320]);
    toast(`⏰ ${a.label || t('Alarm')} · ${a.time}`, '', 8000);
    window.api.window.action('center');
  }

  /* ------------------------------- players ------------------------------- */

  get activePlayer() {
    if (this.s.player === 'spotify') return this.spotify;
    if (this.s.player === 'youtube') return this.youtube;
    return null;
  }

  async startSpotify() {
    this.spotifyStatus = await window.api.spotify.status();
    if (this.spotifyStatus.connected) { this.spotify.start(); this.showPlayerBar(); }
  }

  async connectSpotify() {
    if (!this.s.spotify.clientId) return toast(t('Paste your Client ID first'), 'err');
    toast(t('Opening the browser to sign in to Spotify…'), '', 4000);
    const res = await window.api.spotify.authorize();
    this.spotifyStatus = await window.api.spotify.status();
    if (res?.ok) {
      toast(`${t('Connected')}${res.profile?.display_name ? ` · ${res.profile.display_name}` : ''}`);
      this.spotify.start();
      this.showPlayerBar();
    } else {
      toast(res?.error || t('Connection failed'), 'err', 5000);
    }
    this.panel.render();
  }

  showPlayerBar() {
    $('#player-bar').classList.remove('hidden');
    this.syncPlayerSpace();
  }

  /** The bar floats over the stage, so the clock has to give up the room. */
  syncPlayerSpace() {
    const shown = !$('#player-bar').classList.contains('hidden');
    if (shown === document.body.classList.contains('has-player')) return;
    document.body.classList.toggle('has-player', shown);
    this.resize();
  }

  renderPlayerBarVisibility() {
    const bar = $('#player-bar');
    if (this.s.player === 'none') {
      bar.classList.add('hidden');
      this.spotify.stop();
    } else if (this.s.player === 'spotify') {
      if (this.spotifyStatus?.connected) { this.spotify.start(); bar.classList.remove('hidden'); }
    } else {
      this.spotify.stop();
      if (this.youtube.state.title || this.s.youtube.lastUrl) bar.classList.remove('hidden');
    }
    if (this.s.player === 'youtube') {
      this.youtube.loop = this.s.youtube.loop;
      this.youtube.setVolume?.(this.s.youtube.volume);
    }
    this.syncPlayerSpace();
  }

  renderPlayer() {
    const p = this.activePlayer;
    if (!p) return;
    const st = p.state;
    const art = $('#pb-art');
    if (st.art && art.dataset.src !== st.art) {
      art.dataset.src = st.art;
      art.src = st.art;
      art.onerror = () => art.removeAttribute('src');   // hide rather than show a broken frame
    } else if (!st.art) {
      art.removeAttribute('src');
      delete art.dataset.src;
    }
    $('#pb-title').textContent = st.title
      || (this.s.player === 'spotify' ? t('Nothing playing') : t('No video selected'));
    $('#pb-artist').textContent = st.artist || st.device || '';
    const frac = st.duration ? clamp(st.progress / st.duration, 0, 1) : 0;
    $('.pb-seek i').style.width = `${frac * 100}%`;
    const toggleBtn = $('[data-pl="toggle"]');
    if (toggleBtn.dataset.state !== String(st.playing)) {
      toggleBtn.dataset.state = String(st.playing);
      toggleBtn.innerHTML = st.playing
        ? '<svg viewBox="0 0 24 24"><path d="M8 5h3v14H8zM13 5h3v14h-3z"/></svg>'
        : '<svg viewBox="0 0 24 24"><path d="M8 5l11 7-11 7z"/></svg>';
    }
    const vol = $('#pb-volume');
    if (document.activeElement !== vol) vol.value = st.volume ?? 60;
  }

  /* ------------------------------- focus HUD ------------------------------- */

  renderFocus() {
    const hud = $('#focus-hud');
    const f = this.focus;
    hud.classList.toggle('hidden', f.mode === 'idle');
    if (f.mode === 'idle') return;
    hud.querySelector('.fh-label').textContent = f.label;
    hud.querySelector('.fh-time').textContent = f.display;
    hud.querySelector('.fh-bar i').style.width = `${f.progress * 100}%`;
    hud.querySelector('[data-pomo="toggle"]').textContent = f.running ? t('Pause') : t('Resume');
  }

  /* --------------------------------- UI --------------------------------- */

  syncChrome() {
    $('#settings-btn').classList.toggle('active', this.panel.isOpen);
    $('[data-win="pin"]').classList.toggle('active', !!this.s.alwaysOnTop);
  }

  showUI() {
    document.body.classList.add('ui-visible');
    document.body.classList.remove('hide-cursor');
    this.scheduleHideUI();
  }

  scheduleHideUI() {
    clearTimeout(this.uiTimer);
    if (!this.s.autoHideUI) return;
    this.uiTimer = setTimeout(() => {
      if (this.panel.isOpen || this.hoverUI) return this.scheduleHideUI();
      document.body.classList.remove('ui-visible');
      if (this.isFullscreen) document.body.classList.add('hide-cursor');
    }, 2800);
  }

  bindUI() {
    document.addEventListener('mousemove', () => this.showUI());
    document.addEventListener('mousedown', () => this.showUI());
    window.addEventListener('resize', () => this.resize());
    // a late-loading clock font changes the metrics the fit was measured from
    document.fonts?.ready.then(() => this.refitSoon()).catch(() => {});

    ['#panel', '#titlebar', '#player-bar', '#focus-hud'].forEach((sel) => {
      const node = $(sel);
      node.addEventListener('mouseenter', () => { this.hoverUI = true; });
      node.addEventListener('mouseleave', () => { this.hoverUI = false; });
    });

    // specular highlight follows the pointer across glass surfaces
    document.addEventListener('pointermove', (e) => {
      const g = e.target.closest?.('.glass');
      if (!g) return;
      const r = g.getBoundingClientRect();
      g.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`);
      g.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`);
    });

    $('#settings-btn').onclick = () => this.panel.toggle();

    // every titlebar button, app actions and window controls alike
    $$('[data-win]').forEach((b) => {
      b.onclick = async () => {
        const a = b.dataset.win;
        if (a === 'pin') { this.set({ alwaysOnTop: !this.s.alwaysOnTop }); this.syncChrome(); return; }
        await window.api.window.action(a);
      };
    });

    $$('[data-pl]').forEach((b) => {
      b.onclick = () => {
        const p = this.activePlayer;
        if (!p) return;
        ({ toggle: () => p.toggle(), next: () => p.next(), prev: () => p.prev() })[b.dataset.pl]?.();
      };
    });

    $('#pb-volume').oninput = (e) => {
      const v = Number(e.target.value);
      this.activePlayer?.setVolume(v);
      if (this.s.player === 'youtube') this.set({ youtube: { volume: v } });
    };

    $('.pb-seek').onclick = (e) => {
      const r = e.currentTarget.getBoundingClientRect();
      this.activePlayer?.seek?.((e.clientX - r.left) / r.width);
    };

    $$('[data-pomo]').forEach((b) => {
      b.onclick = () => ({
        toggle: () => this.focus.toggle(),
        skip: () => this.focus.skip(),
        stop: () => this.focus.stop(),
      })[b.dataset.pomo]();
    });

    window.api.app.onOpenSettings(() => this.panel.open('faces'));
    window.api.window.onFullscreen((v) => {
      this.isFullscreen = v;
      document.body.classList.toggle('squared', v);
      this.showUI();
    });
    window.api.window.onMaximized?.((v) => document.body.classList.toggle('squared', v));
    window.api.window.onFocus((v) => document.body.classList.toggle('unfocused', !v));
    window.api.app.onHotkey((name) => {
      const p = this.activePlayer;
      if (name === 'playPause') p?.toggle();
      if (name === 'nextTrack') p?.next();
      if (name === 'prevTrack') p?.prev();
    });
    window.api.settings.onChange((s) => { this.s = s; this.apply(); });

    document.addEventListener('keydown', (e) => this.onKey(e));
  }

  onKey(e) {
    const typing = /input|textarea|select/i.test(e.target.tagName);
    if (typing) {
      if (e.key === 'Escape') e.target.blur();
      return;
    }
    const k = e.key.toLowerCase();
    if (k === 'escape') {
      if (this.panel.isOpen) this.panel.close();
      else if (this.isFullscreen) window.api.window.action('fullscreen');
      return;
    }
    if (k === ' ') { e.preventDefault(); this.activePlayer?.toggle(); return; }
    if (k === 'f' || e.key === 'F11') { window.api.window.action('fullscreen'); return; }
    if (k === 's') { this.panel.toggle(); return; }
    if (k === 't' && (e.ctrlKey || e.metaKey)) { this.set({ alwaysOnTop: !this.s.alwaysOnTop }); this.syncChrome(); return; }
    if (k === 't') { this.cycle('theme', THEMES.map((t) => t.id)); return; }
    if (k === 'c') { this.cycle('face', FACES.map((f) => f.id), () => this.mountFace()); return; }
  }

  cycle(key, list, after) {
    const i = (list.indexOf(this.s[key]) + 1) % list.length;
    this.transition(() => {
      this.set({ [key]: list[i] });
      after?.();
      if (this.panel.isOpen) this.panel.render();
    });
    toast(list[i]);
  }
}

/** `<input type="color">` only accepts #rrggbb, so normalise whatever CSS reports. */
function toHex(value) {
  const v = String(value).trim();
  if (/^#[\da-f]{6}$/i.test(v)) return v.toLowerCase();
  if (/^#[\da-f]{3}$/i.test(v)) return `#${[...v.slice(1)].map((ch) => ch + ch).join('')}`.toLowerCase();
  const m = v.match(/rgba?\(([^)]+)\)/i);
  if (m) {
    const [r, g, b] = m[1].split(/[,\s/]+/).map(Number);
    return `#${[r, g, b].map((n) => Math.max(0, Math.min(255, n | 0)).toString(16).padStart(2, '0')).join('')}`;
  }
  return '#888888';
}

/** Relative luminance of a #rrggbb colour, for picking readable text on an accent. */
function luminance(hex) {
  const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(String(hex).trim());
  if (!m) return 0;
  const [r, g, b] = m.slice(1).map((h) => {
    const v = parseInt(h, 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/* renderer-side mirror of the main process merge */
function deepMerge(base, patch) {
  if (Array.isArray(patch)) return patch.slice();
  if (patch && typeof patch === 'object' && base && typeof base === 'object' && !Array.isArray(base)) {
    const out = { ...base };
    for (const k of Object.keys(patch)) out[k] = deepMerge(base[k], patch[k]);
    return out;
  }
  return patch === undefined ? base : patch;
}

const app = new App();
window.app = app;
app.boot();
