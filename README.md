# Ora Clock

A desktop clock for Windows/macOS/Linux, built with Electron. Open the app and you
immediately get a **Fliqlo**-style flip clock, with many clock faces and themes, a
**liquid glass** effect, and music playback from **Spotify** or **YouTube**.

![Fliqlo](assets/icon.png)

## Try it

```bash
npm install
```

```bash
npm start
```

Build the Windows installer (NSIS + portable):

```bash
npm run dist
```

## Features

**Clock faces** — switch quickly with the `C` key
| Face | Description |
| --- | --- |
| Flip | Fliqlo-style flip clock (default) — 12-hour, AM/PM in the card corner, 3D flip |
| Digital | Thin large digits, optional seconds and AM/PM |
| Analog | SVG hands, smooth seconds hand |
| Rings | Three arcs for hours / minutes / seconds |
| Word | Text grid like "IT IS A QUARTER PAST TWO" |
| Binary | BCD binary clock |

**Interface**
- Default theme is **Obsidian** — pure black background, black flip cards, AM/PM in the
  hour-card corner, no colon, Helvetica Neue/Arial Bold font: exactly like the
  original Fliqlo.
- 16 built-in themes (Obsidian, Midnight, Nord, Dracula, Tokyo, Catppuccin, Sunset,
  Forest, Ocean, Sakura, Cyber, Mocha, Paper, Linen, Daylight) + **Custom**: pick your
  own 9 colors (accent, text, top/bottom background, top/bottom cards, card digits,
  light/dark), with a button to pick colors from the current interface as a starting
  point.
- **Clock fonts**: 7 built-in sets (Fliqlo Classic, Apple SF Pro, Rounded, Condensed,
  Monospace, Serif, Display) or type any installed font name — the app lists your
  machine's fonts for suggestions. Font weight is adjustable too.
- Liquid glass: blurred background + refractive border + a specular highlight that
  follows the cursor, with an optional animated ripple layer. On Windows 11 it uses
  the OS's Acrylic background automatically.
- Background: theme-based, custom gradient, an image from your machine, or the
  currently playing YouTube video.
- Apple-style interface: red/yellow/green traffic lights, segmented-control tab bar,
  and a settings panel grouped into rounded cards with hairline separators like
  macOS System Settings.
- Responsive: from 1180×740 down to 380×300, the panel turns into a bottom sheet, the
  dock shrinks to an icon, and the music bar stacks above the dock.
- Interface language: **English** (default) or Vietnamese, switchable in
  `System → General`.

**Music**
- **Spotify** — connects via OAuth PKCE (no client secret needed). See the current
  track, play/pause, skip, seek, change volume, pick a playback device, or paste a
  song/playlist link to play it. *Playback control requires a Premium account; free
  accounts can still see the currently playing track.*
- **YouTube** — paste a video or playlist link to play it (audio only, or use the
  video itself as an animated background). Remembers the last link when you reopen
  the app.

**Tools**
- Pomodoro: customizable work/break durations, automatic session rotation, chime.
- Quick countdown timer (5–45 minutes) and a stopwatch with lap recording.
- Repeating alarms by weekday.
- World clock: add multiple time zones shown right below the main clock.

**Window**
- Always on top, adjustable opacity, click-through (overlay) mode.
- Auto-hide the controls bar, hide when focus is lost, prevent the screen from
  sleeping.
- Launch with Windows, start hidden in the system tray, tray icon.
- Automatic night-dim by schedule, and OLED burn-in shift prevention.
- Customizable global shortcuts (show/hide, fullscreen, music control).

## In-app shortcuts

| Key | Action |
| --- | --- |
| `Space` | Play / pause music |
| `F` / `F11` | Fullscreen |
| `S` | Open / close the settings panel |
| `T` | Next theme |
| `C` | Next clock face |
| `Ctrl` + `T` | Toggle always on top |
| `Esc` | Close settings / leave fullscreen |

## Connecting Spotify

1. Open <https://developer.spotify.com/dashboard> and create an app (free).
2. In **Redirect URIs**, add exactly: `http://127.0.0.1:8888/callback`
3. Choose **Web API**, save, and copy the **Client ID**.
4. In Ora Clock: `Settings → Music → Spotify`, paste the Client ID and click **Connect**.

The Client ID and refresh token are only stored in `settings.json` on your machine.
The app has no client secret and sends no data anywhere except Spotify.

## Source structure

```
src/
  main/
    main.js      window, system tray, global shortcuts, IPC
    server.js    loopback server serving the UI (HTTP origin needed for YouTube)
    fonts.js     lists fonts installed on the machine
    store.js     reads/writes settings.json
    spotify.js   OAuth PKCE + Web API proxy
    preload.js   contextBridge bridge
  renderer/
    css/         base · themes · glass · clocks · panel
    js/
      app.js     render loop, applies settings, shortcuts
      faces.js   6 clock faces
      panel.js   settings panel (declared per tab)
      fonts.js   built-in font sets for the clock
      i18n.js    en/vi translation map (English strings are the keys)
      spotify.js · youtube.js   players
      tools.js   pomodoro · alarms · stopwatch
tools/make-icon.js   generates assets/icon.png with no external dependencies
```

Settings are stored at `%APPDATA%\Ora Clock\settings.json` (Windows).

## Technical notes

- The UI is served over `http://127.0.0.1:<random port>` instead of `file://`
  because the YouTube IFrame API never completes its postMessage handshake from a
  `file://` origin. The server only listens on loopback; user-picked background
  images go through the `/local` route with a session token.
- The clock size is measured directly from the DOM and then scaled to fit the
  window, so every face fills the frame at any window size.
- `npm run dev` pipes renderer logs to the terminal.
- `npm run selftest` opens every settings tab, clock face, theme, and font in turn
  (`[selftest] ok`), then resizes the window through 6 sizes to verify no element
  overflows or overlaps (`[responsive] ok`).