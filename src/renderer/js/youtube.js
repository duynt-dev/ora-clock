/* ---------------------------------------------------------------
   YouTube controller — plays any video/playlist link through the
   IFrame API. The iframe normally sits off-screen (audio only); with
   "video as wallpaper" it expands behind the clock as a live background.
   --------------------------------------------------------------- */
import { toast } from './util.js';
import { t } from './i18n.js';

let apiReady = null;
function loadApi() {
  if (apiReady) return apiReady;
  apiReady = new Promise((resolve, reject) => {
    if (window.YT?.Player) return resolve(window.YT);
    window.onYouTubeIframeAPIReady = () => resolve(window.YT);
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    tag.onerror = () => reject(new Error(t('Could not load the YouTube API (offline?)')));
    document.head.append(tag);
    setTimeout(() => reject(new Error(t('YouTube API timed out'))), 15000);
  });
  return apiReady;
}

export function parseYouTube(input) {
  const v = String(input || '').trim();
  if (!v) return null;
  if (/^[A-Za-z0-9_-]{11}$/.test(v)) return { videoId: v };
  let url;
  try { url = new URL(v.startsWith('http') ? v : `https://${v}`); } catch { return null; }
  const list = url.searchParams.get('list');
  if (url.hostname === 'youtu.be') return { videoId: url.pathname.slice(1, 12), list };
  if (!/youtube(-nocookie)?\.com$/.test(url.hostname.replace(/^www\./, ''))) return null;
  const id = url.searchParams.get('v')
    || url.pathname.match(/\/(?:embed|shorts|live|v)\/([A-Za-z0-9_-]{11})/)?.[1];
  if (id) return { videoId: id, list };
  if (list) return { list };
  return null;
}

export class YouTubePlayer {
  constructor(onChange) {
    this.onChange = onChange;
    this.state = { ready: false, playing: false, title: '', artist: 'YouTube', art: '', progress: 0, duration: 0, volume: 60 };
    this.player = null;
    this.timer = null;
  }

  emit() { this.onChange?.(this.state); }

  async ensure() {
    if (this.player) return this.player;
    const YT = await loadApi();
    await new Promise((resolve) => {
      this.player = new YT.Player('yt-player', {
        height: '180', width: '320',
        playerVars: { autoplay: 0, controls: 0, disablekb: 1, modestbranding: 1, playsinline: 1, rel: 0, iv_load_policy: 3 },
        events: {
          onReady: () => { this.state.ready = true; resolve(); },
          onStateChange: (e) => this.handleState(e),
          onError: () => toast(t('This video cannot be played outside YouTube. Try another link.'), 'err', 4000),
        },
      });
    });
    return this.player;
  }

  handleState(e) {
    const YT = window.YT;
    this.state.playing = e.data === YT.PlayerState.PLAYING;
    const d = this.player.getVideoData?.() || {};
    this.state.title = d.title || '';
    this.state.artist = d.author || 'YouTube';
    this.state.art = d.video_id ? `https://i.ytimg.com/vi/${d.video_id}/mqdefault.jpg` : '';

    // YouTube refuses some videos in embeds (age-gated, sign-in only, region locked)
    if (d.isPlayable === false && d.errorCode && this._lastBlocked !== d.video_id) {
      this._lastBlocked = d.video_id;
      toast(t('This video cannot be played outside YouTube. Try another link.'), 'err', 5000);
    }
    this.state.duration = (this.player.getDuration?.() || 0) * 1000;
    if (e.data === YT.PlayerState.ENDED && this.loop) this.player.playVideo();
    this.emit();
    this.poll();
  }

  poll() {
    clearTimeout(this.timer);
    if (!this.player) return;
    this.state.progress = (this.player.getCurrentTime?.() || 0) * 1000;
    this.state.duration = (this.player.getDuration?.() || 0) * 1000;
    this.emit();
    this.timer = setTimeout(() => this.poll(), this.state.playing ? 1000 : 4000);
  }

  /** autoplay:false only queues the video, so restoring the last link stays silent. */
  async load(url, { volume = 60, loop = true, autoplay = true } = {}) {
    const parsed = parseYouTube(url);
    if (!parsed) { toast(t('Invalid YouTube link'), 'err'); return false; }
    this.loop = loop;
    try {
      await this.ensure();
    } catch (err) {
      toast(err.message, 'err', 4000);
      return false;
    }
    this.player.setVolume(volume);
    this.state.volume = volume;
    if (parsed.list) {
      const args = { list: parsed.list, listType: 'playlist', index: 0 };
      autoplay ? this.player.loadPlaylist(args) : this.player.cuePlaylist(args);
    } else {
      autoplay ? this.player.loadVideoById(parsed.videoId) : this.player.cueVideoById(parsed.videoId);
    }
    this.poll();
    return true;
  }

  toggle() {
    if (!this.player) return;
    this.state.playing ? this.player.pauseVideo() : this.player.playVideo();
  }

  play() { this.player?.playVideo(); }
  pause() { this.player?.pauseVideo(); }
  next() { this.player?.nextVideo?.(); }
  prev() { this.player?.previousVideo?.(); }
  setVolume(v) { this.state.volume = v; this.player?.setVolume?.(v); }
  seek(fraction) {
    if (!this.player || !this.state.duration) return;
    this.player.seekTo((this.state.duration / 1000) * fraction, true);
    this.poll();
  }

  setMuted(m) { m ? this.player?.mute?.() : this.player?.unMute?.(); }

  stop() {
    clearTimeout(this.timer);
    this.player?.stopVideo?.();
    this.state.playing = false;
    this.emit();
  }
}
