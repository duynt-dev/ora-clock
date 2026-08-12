/* ---------------------------------------------------------------
   Spotify controller (renderer side).
   All HTTP goes through the main process, which owns the tokens.
   Controlling playback needs Premium; "now playing" works on free.
   --------------------------------------------------------------- */
import { toast } from './util.js';
import { t } from './i18n.js';

const POLL_ACTIVE = 2500;
const POLL_IDLE = 9000;

export class SpotifyPlayer {
  constructor(onChange) {
    this.onChange = onChange;
    this.state = { connected: false, playing: false, title: '', artist: '', art: '', progress: 0, duration: 0, device: '', volume: 60 };
    this.timer = null;
    this.enabled = false;
    this.lastSeek = 0;
  }

  async init() {
    const status = await window.api.spotify.status();
    this.state.connected = status.connected;
    this.emit();
    return status;
  }

  emit() { this.onChange?.(this.state); }

  async call(method, path, body) {
    const res = await window.api.spotify.api(method, path, body);
    if (!res.ok) {
      if (res.status === 401) this.state.connected = false;
      throw Object.assign(new Error(res.error || 'Spotify error'), { status: res.status, reason: res.reason });
    }
    return res.data;
  }

  start() {
    if (this.enabled) return;
    this.enabled = true;
    this.tick();
  }

  stop() {
    this.enabled = false;
    clearTimeout(this.timer);
    this.timer = null;
  }

  schedule(ms) {
    clearTimeout(this.timer);
    if (this.enabled) this.timer = setTimeout(() => this.tick(), ms);
  }

  async tick() {
    if (!this.enabled) return;
    if (document.hidden) return this.schedule(POLL_IDLE);
    try {
      const data = await this.call('GET', '/me/player');
      this.state.connected = true;
      if (!data || !data.item) {
        Object.assign(this.state, { playing: false, title: '', artist: '', art: '', progress: 0, duration: 0, device: data?.device?.name || '' });
      } else {
        const it = data.item;
        Object.assign(this.state, {
          playing: !!data.is_playing,
          title: it.name,
          artist: (it.artists || []).map((a) => a.name).join(', ') || it.show?.name || '',
          art: it.album?.images?.[0]?.url || it.images?.[0]?.url || '',
          progress: data.progress_ms || 0,
          duration: it.duration_ms || 0,
          device: data.device?.name || '',
          volume: data.device?.volume_percent ?? this.state.volume,
          url: it.external_urls?.spotify || '',
        });
      }
      this.emit();
      this.schedule(this.state.playing ? POLL_ACTIVE : POLL_IDLE);
    } catch (err) {
      this.state.connected = err.status !== 401 && this.state.connected;
      this.emit();
      this.schedule(POLL_IDLE * 2);
    }
  }

  /** Optimistic local progress between polls, so the seek bar moves smoothly. */
  advance(ms) {
    if (this.state.playing && this.state.duration) {
      this.state.progress = Math.min(this.state.duration, this.state.progress + ms);
    }
  }

  guard(fn) {
    return fn().catch((err) => {
      if (err.reason === 'PREMIUM_REQUIRED') toast(t('Playback control needs Spotify Premium'), 'err');
      else if (err.reason === 'NO_ACTIVE_DEVICE' || err.status === 404) toast(t('No active device. Open Spotify on your phone or computer first.'), 'err', 4000);
      else toast(err.message || t('Spotify error'), 'err');
    });
  }

  toggle() {
    const wantPlay = !this.state.playing;
    this.state.playing = wantPlay;
    this.emit();
    return this.guard(async () => {
      await this.call('PUT', wantPlay ? '/me/player/play' : '/me/player/pause');
      setTimeout(() => this.tick(), 400);
    });
  }

  next() { return this.guard(async () => { await this.call('POST', '/me/player/next'); setTimeout(() => this.tick(), 600); }); }
  prev() { return this.guard(async () => { await this.call('POST', '/me/player/previous'); setTimeout(() => this.tick(), 600); }); }

  setVolume(v) {
    this.state.volume = v;
    clearTimeout(this._volTimer);
    this._volTimer = setTimeout(() => {
      this.guard(() => this.call('PUT', `/me/player/volume?volume_percent=${Math.round(v)}`));
    }, 260);
  }

  seek(fraction) {
    if (!this.state.duration) return;
    const ms = Math.round(this.state.duration * fraction);
    this.state.progress = ms;
    this.emit();
    return this.guard(async () => { await this.call('PUT', `/me/player/seek?position_ms=${ms}`); setTimeout(() => this.tick(), 500); });
  }

  devices() { return this.call('GET', '/me/player/devices').then((d) => d?.devices || []).catch(() => []); }

  transfer(id) {
    return this.guard(async () => {
      await this.call('PUT', '/me/player', { device_ids: [id], play: this.state.playing });
      setTimeout(() => this.tick(), 700);
    });
  }

  /** Accepts a Spotify URL or URI for a track / album / playlist / artist. */
  playUri(input) {
    const uri = parseSpotifyUri(input);
    if (!uri) { toast(t('Invalid Spotify link'), 'err'); return Promise.resolve(); }
    const body = uri.includes(':track:') ? { uris: [uri] } : { context_uri: uri };
    return this.guard(async () => {
      await this.call('PUT', '/me/player/play', body);
      toast(t('Playing on Spotify'));
      setTimeout(() => this.tick(), 800);
    });
  }

  async playlists() {
    try {
      const data = await this.call('GET', '/me/playlists?limit=30');
      return data?.items || [];
    } catch { return []; }
  }
}

export function parseSpotifyUri(input) {
  const v = String(input || '').trim();
  if (/^spotify:(track|album|playlist|artist):[A-Za-z0-9]+$/.test(v)) return v;
  const m = v.match(/open\.spotify\.com\/(?:intl-[a-z]+\/)?(track|album|playlist|artist)\/([A-Za-z0-9]+)/);
  return m ? `spotify:${m[1]}:${m[2]}` : null;
}
