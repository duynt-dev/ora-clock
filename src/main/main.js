'use strict';
const path = require('path');
const {
  app, BrowserWindow, ipcMain, Tray, Menu, globalShortcut,
  shell, nativeImage, dialog, powerSaveBlocker, nativeTheme,
} = require('electron');
const os = require('os');
const { Store } = require('./store');
const { Spotify } = require('./spotify');
const { RendererServer } = require('./server');
const { listFonts } = require('./fonts');

const isWin11 = process.platform === 'win32' && Number(os.release().split('.')[2]) >= 22000;

let win = null;
let tray = null;
let store = null;
let spotify = null;
let server = null;
let blockerId = null;
let quitting = false;

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => showWindow());
}

function createWindow() {
  const bounds = store.get('windowBounds') || { width: 1000, height: 620 };

  win = new BrowserWindow({
    ...bounds,
    minWidth: 380,
    minHeight: 260,
    show: false,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#00000000',
    ...(isWin11 && store.get('acrylic') ? { backgroundMaterial: 'acrylic' } : {}),
    ...(process.platform === 'darwin' ? { vibrancy: 'under-window', visualEffectState: 'active' } : {}),
    icon: path.join(__dirname, '..', '..', 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      backgroundThrottling: false,
      // the user presses play in our own UI; the gesture does not reach the
      // cross-origin YouTube frame, so allow it to start on its own
      autoplayPolicy: 'no-user-gesture-required',
    },
  });

  win.loadURL(`${server.origin}/index.html${process.env.LUMINA_SELFTEST ? '?selftest=1' : ''}`);

  if (process.env.LUMINA_DEBUG) {
    // the signature changed across Electron versions — accept both shapes
    win.webContents.on('console-message', (a, _level, message, line) => {
      const text = typeof a === 'object' && a?.message ? a.message : message;
      const at = typeof a === 'object' && a?.lineNumber ? a.lineNumber : line;
      console.log(`[renderer:${at}] ${text}`);
    });
  }

  win.once('ready-to-show', () => {
    if (!store.get('startMinimizedToTray')) showWindow();
    applyWindowSettings();
  });

  const saveBounds = () => {
    if (win && !win.isDestroyed() && !win.isMaximized() && !win.isFullScreen()) {
      store.set({ windowBounds: win.getBounds() });
    }
  };
  win.on('resize', saveBounds);
  win.on('move', saveBounds);

  win.on('blur', () => {
    win.webContents.send('window:focus', false);
    if (store.get('hideOnBlur') && !win.isFullScreen()) win.hide();
  });
  win.on('focus', () => win.webContents.send('window:focus', true));
  win.on('enter-full-screen', () => win.webContents.send('window:fullscreen', true));
  win.on('leave-full-screen', () => win.webContents.send('window:fullscreen', false));
  win.on('maximize', () => win.webContents.send('window:maximized', true));
  win.on('unmaximize', () => win.webContents.send('window:maximized', false));

  win.on('close', (e) => {
    // Keep running in the tray unless the user really quits.
    if (!quitting) {
      e.preventDefault();
      win.hide();
    }
  });

  // External links always open in the real browser, never inside the app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

function showWindow() {
  if (!win) return;
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
}

function toggleWindow() {
  if (!win) return;
  win.isVisible() && win.isFocused() ? win.hide() : showWindow();
}

function applyWindowSettings() {
  if (!win || win.isDestroyed()) return;
  const s = store.all;
  win.setAlwaysOnTop(!!s.alwaysOnTop, 'floating');
  win.setOpacity(Number(s.opacity) || 1);
  win.setIgnoreMouseEvents(!!s.clickThrough, { forward: true });
  if (isWin11) {
    try { win.setBackgroundMaterial(s.acrylic ? 'acrylic' : 'none'); } catch { /* older Electron */ }
  }
  if (process.platform !== 'linux') app.setLoginItemSettings({ openAtLogin: !!s.launchAtLogin });

  if (s.keepAwake && blockerId === null) {
    blockerId = powerSaveBlocker.start('prevent-display-sleep');
  } else if (!s.keepAwake && blockerId !== null) {
    powerSaveBlocker.stop(blockerId);
    blockerId = null;
  }
}

/* The tray menu lives outside the renderer, so it carries its own tiny table. */
const TRAY_TEXT = {
  en: { show: 'Show / hide clock', onTop: 'Keep on top', full: 'Full screen', settings: 'Settings…', quit: 'Quit' },
  vi: { show: 'Hiện / ẩn đồng hồ', onTop: 'Luôn hiện trên cùng', full: 'Toàn màn hình', settings: 'Cài đặt…', quit: 'Thoát' },
};

function createTray() {
  const img = nativeImage.createFromPath(path.join(__dirname, '..', '..', 'assets', 'tray.png'));
  tray = new Tray(img.isEmpty() ? nativeImage.createEmpty() : img);
  tray.setToolTip('Ora Clock');
  buildTrayMenu();
  tray.on('click', toggleWindow);
}

function buildTrayMenu() {
  if (!tray) return;
  const s = TRAY_TEXT[store.get('language')] || TRAY_TEXT.en;
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: s.show, click: toggleWindow },
    { type: 'separator' },
    {
      label: s.onTop,
      type: 'checkbox',
      checked: !!store.get('alwaysOnTop'),
      click: (item) => { store.set({ alwaysOnTop: item.checked }); applyWindowSettings(); pushSettings(); },
    },
    { label: s.full, click: () => { showWindow(); win.setFullScreen(!win.isFullScreen()); } },
    { label: s.settings, click: () => { showWindow(); win.webContents.send('ui:open-settings'); } },
    { type: 'separator' },
    { label: s.quit, click: () => { quitting = true; app.quit(); } },
  ]));
}

function pushSettings() {
  if (win && !win.isDestroyed()) win.webContents.send('settings:changed', store.all);
}

function registerHotkeys() {
  globalShortcut.unregisterAll();
  const hk = store.get('hotkeys') || {};
  if (!hk.enabled) return;
  const bind = (accel, fn) => {
    if (!accel) return;
    try { globalShortcut.register(accel, fn); } catch { /* invalid accelerator */ }
  };
  bind(hk.toggleWindow, toggleWindow);
  bind(hk.fullscreen, () => { showWindow(); win.setFullScreen(!win.isFullScreen()); });
  bind(hk.playPause, () => win?.webContents.send('hotkey', 'playPause'));
  bind(hk.nextTrack, () => win?.webContents.send('hotkey', 'nextTrack'));
  bind(hk.prevTrack, () => win?.webContents.send('hotkey', 'prevTrack'));
}

/* ------------------------------- IPC ------------------------------- */

function registerIpc() {
  ipcMain.handle('settings:get', () => store.all);

  ipcMain.handle('settings:set', (_e, patch) => {
    const next = store.set(patch);
    applyWindowSettings();
    if (patch && patch.hotkeys) registerHotkeys();
    if (patch && (patch.language || patch.alwaysOnTop !== undefined)) buildTrayMenu();
    return next;
  });

  ipcMain.handle('settings:reset', () => {
    const next = store.reset();
    applyWindowSettings();
    registerHotkeys();
    return next;
  });

  ipcMain.handle('window:action', (_e, action) => {
    if (!win) return null;
    switch (action) {
      case 'minimize': win.minimize(); break;
      case 'maximize': win.isMaximized() ? win.unmaximize() : win.maximize(); break;
      case 'close': win.hide(); break;
      case 'quit': quitting = true; app.quit(); break;
      case 'fullscreen': win.setFullScreen(!win.isFullScreen()); break;
      case 'center': win.center(); break;
    }
    return { fullscreen: win.isFullScreen(), maximized: win.isMaximized() };
  });

  ipcMain.handle('window:size', (_e, { width, height }) => {
    if (!win || win.isFullScreen()) return null;
    if (win.isMaximized()) win.unmaximize();
    win.setSize(Math.max(320, Math.round(width)), Math.max(240, Math.round(height)));
    return win.getSize();
  });

  ipcMain.handle('window:state', () => ({
    fullscreen: win?.isFullScreen() ?? false,
    maximized: win?.isMaximized() ?? false,
    supportsAcrylic: isWin11,
  }));

  ipcMain.handle('app:open-external', (_e, url) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
  });

  ipcMain.handle('app:pick-image', async () => {
    const vi = store.get('language') === 'vi';
    const res = await dialog.showOpenDialog(win, {
      title: vi ? 'Chọn ảnh nền' : 'Choose a wallpaper',
      properties: ['openFile'],
      filters: [{ name: vi ? 'Ảnh' : 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'] }],
    });
    if (res.canceled || !res.filePaths[0]) return null;
    return res.filePaths[0];
  });

  ipcMain.handle('app:fonts', () => listFonts());

  ipcMain.handle('app:info', () => ({
    version: app.getVersion(),
    platform: process.platform,
    electron: process.versions.electron,
    settingsPath: path.join(app.getPath('userData'), 'settings.json'),
    assetToken: server.token,   // lets the renderer request user-picked wallpapers
  }));

  // --- Spotify ---
  ipcMain.handle('spotify:status', () => ({
    connected: spotify.connected,
    hasClientId: !!store.get('spotify').clientId,
    redirectUri: spotify.redirectUri(),
  }));

  ipcMain.handle('spotify:authorize', async () => {
    try {
      return await spotify.authorize();
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('spotify:logout', () => { spotify.logout(); return { ok: true }; });

  ipcMain.handle('spotify:api', async (_e, { method, path: p, body }) => {
    try {
      return { ok: true, data: await spotify.api(method || 'GET', p, body) };
    } catch (err) {
      return { ok: false, error: err.message, status: err.status, reason: err.reason };
    }
  });
}

/* ------------------------------ lifecycle ------------------------------ */

app.whenReady().then(async () => {
  app.setAppUserModelId('com.ora.clock');
  store = new Store();
  spotify = new Spotify(store);
  server = new RendererServer(path.join(__dirname, '..', 'renderer'));
  await server.listen();
  registerIpc();
  createWindow();
  createTray();
  registerHotkeys();
  nativeTheme.on('updated', () => pushSettings());
});

app.on('window-all-closed', () => { /* stay alive in the tray */ });
app.on('activate', () => (win ? showWindow() : createWindow()));
app.on('before-quit', () => { quitting = true; store?.save(); });
app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  spotify?.stopServer();
  server?.close();
});
