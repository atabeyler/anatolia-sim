import { app, BrowserWindow, dialog, shell } from 'electron';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const PORT = Number(process.env.PORT ?? 3001);
const LOCAL_URL = `http://127.0.0.1:${PORT}`;
const APP_ROOT = app.getAppPath();
const SERVER_ENTRY = resolve(APP_ROOT, 'server/src/index.js');
const CLIENT_INDEX = resolve(APP_ROOT, 'client/dist/index.html');

let mainWindow = null;
let serverProcess = null;
let versionWatcher = null;
let knownVersion = null;

function sleep(ms) {
  return new Promise(resolveFn => setTimeout(resolveFn, ms));
}

async function waitForServer(timeoutMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${LOCAL_URL}/api/health`, { cache: 'no-store' });
      if (res.ok) return true;
    } catch {}
    await sleep(500);
  }
  return false;
}

async function ensureLocalServer() {
  try {
    const res = await fetch(`${LOCAL_URL}/api/health`, { cache: 'no-store' });
    if (res.ok) return;
  } catch {}

  if (!existsSync(SERVER_ENTRY)) {
    throw new Error(`Server entry not found: ${SERVER_ENTRY}`);
  }

  serverProcess = spawn(process.execPath, [SERVER_ENTRY], {
    cwd: APP_ROOT,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      PORT: String(PORT),
      CLIENT_URL: LOCAL_URL,
    },
    stdio: 'inherit',
    windowsHide: true,
  });

  serverProcess.on('exit', (code, signal) => {
    if (!app.isQuiting && code !== 0 && signal !== 'SIGTERM') {
      console.error(`[desktop] local server exited (${code ?? 'null'}, ${signal ?? 'no-signal'})`);
    }
  });

  const ready = await waitForServer();
  if (!ready) {
    throw new Error('Local server did not become ready in time.');
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 1000,
    minWidth: 1280,
    minHeight: 800,
    backgroundColor: '#040412',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url).catch(() => {});
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startVersionWatcher() {
  if (versionWatcher) clearInterval(versionWatcher);
  versionWatcher = setInterval(async () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    try {
      const res = await fetch(`${LOCAL_URL}/api/health`, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      if (!knownVersion) {
        knownVersion = data.version ?? null;
        return;
      }
      if (data.version && data.version !== knownVersion) {
        knownVersion = data.version;
        mainWindow.reload();
      }
    } catch {}
  }, 60_000);
}

async function boot() {
  if (!existsSync(CLIENT_INDEX)) {
    await dialog.showErrorBox(
      'Anatolia-Sim Desktop',
      'Client build not found. Run `npm run build` before starting the desktop app.'
    );
    app.quit();
    return;
  }

  await ensureLocalServer();
  createWindow();
  await mainWindow.loadURL(LOCAL_URL);
  startVersionWatcher();
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    boot().catch(err => {
      console.error('[desktop] boot failed:', err);
      dialog.showErrorBox('Anatolia-Sim Desktop', err?.message ?? String(err));
      app.quit();
    });
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  app.isQuiting = true;
  if (versionWatcher) {
    clearInterval(versionWatcher);
    versionWatcher = null;
  }
  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill('SIGTERM');
  }
});
