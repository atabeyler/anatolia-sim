import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT ?? 3001);
const LOCAL_URL = `http://127.0.0.1:${PORT}`;

// Paths — work both in dev (source tree) and packaged (resourcesPath)
const isPackaged = app.isPackaged;
const RESOURCES = isPackaged ? process.resourcesPath : resolve(__dirname, '..');
const SERVER_ROOT = resolve(RESOURCES, 'server');
const SERVER_ENTRY = resolve(SERVER_ROOT, 'src/index.js');
const CLIENT_DIST = resolve(RESOURCES, 'client/dist');
const CLIENT_INDEX = resolve(CLIENT_DIST, 'index.html');
const CONFIG_PATH = join(app.getPath('userData'), 'config.json');

let mainWindow = null;
let serverProcess = null;
let versionWatcher = null;
let knownVersion = null;

// ─── Config ────────────────────────────────────────────────────────────────────

function loadConfig() {
  try {
    if (existsSync(CONFIG_PATH)) {
      return JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
    }
  } catch { /* corrupt config → re-setup */ }
  return null;
}

function saveConfig(cfg) {
  writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf8');
}

// ─── Setup window ──────────────────────────────────────────────────────────────

function showSetupWindow() {
  return new Promise(resolve => {
    const setupWin = new BrowserWindow({
      width: 580,
      height: 640,
      resizable: false,
      backgroundColor: '#040412',
      autoHideMenuBar: true,
      title: 'Anatolia Sim — Kurulum',
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        preload: join(__dirname, 'preload.mjs'),
      },
    });

    const setupHtml = isPackaged
      ? join(process.resourcesPath, 'app', 'desktop', 'setup.html')
      : join(__dirname, 'setup.html');

    setupWin.loadFile(setupHtml);

    ipcMain.once('setup-save', (_event, config) => {
      saveConfig(config);
      setupWin.close();
      resolve(config);
    });

    setupWin.on('closed', () => resolve(null));
  });
}

// ─── Server ────────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function waitForServer(timeoutMs = 90000) {
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

function buildServerEnv(cfg) {
  const useLocalDb = cfg?.DESKTOP_LOCAL_DB === '1' || !cfg?.DATABASE_URL;
  const env = {
    ...process.env,
    PORT: String(PORT),
    CLIENT_URL: LOCAL_URL,
    NODE_ENV: 'production',
  };

  if (useLocalDb) {
    env.DESKTOP_LOCAL_DB = '1';
    env.PGLITE_DATA_DIR = join(app.getPath('userData'), 'db');
  } else {
    env.DATABASE_URL = cfg.DATABASE_URL;
  }

  // JWT secrets: use config values or generate stable ones stored in userData
  const secretsPath = join(app.getPath('userData'), 'secrets.json');
  let secrets = {};
  try { secrets = JSON.parse(readFileSync(secretsPath, 'utf8')); } catch {}
  if (!secrets.JWT_SECRET) secrets.JWT_SECRET = randomBytes(48).toString('hex');
  if (!secrets.JWT_REFRESH_SECRET) secrets.JWT_REFRESH_SECRET = randomBytes(48).toString('hex');
  writeFileSync(secretsPath, JSON.stringify(secrets, null, 2), 'utf8');

  env.JWT_SECRET = cfg?.JWT_SECRET || secrets.JWT_SECRET;
  env.JWT_REFRESH_SECRET = cfg?.JWT_REFRESH_SECRET || secrets.JWT_REFRESH_SECRET;

  if (cfg?.ANTHROPIC_API_KEY) env.ANTHROPIC_API_KEY = cfg.ANTHROPIC_API_KEY;

  return env;
}

async function ensureLocalServer(cfg) {
  try {
    const res = await fetch(`${LOCAL_URL}/api/health`, { cache: 'no-store' });
    if (res.ok) return;
  } catch {}

  if (!existsSync(SERVER_ENTRY)) {
    throw new Error(`Sunucu dosyası bulunamadı: ${SERVER_ENTRY}`);
  }

  serverProcess = spawn(process.execPath, [SERVER_ENTRY], {
    cwd: SERVER_ROOT,
    env: buildServerEnv(cfg),
    stdio: 'inherit',
    windowsHide: true,
  });

  serverProcess.on('exit', (code, signal) => {
    if (!app.isQuiting && code !== 0 && signal !== 'SIGTERM') {
      console.error(`[desktop] sunucu kapandı (${code ?? 'null'}, ${signal ?? '-'})`);
    }
  });

  const ready = await waitForServer();
  if (!ready) throw new Error('Sunucu zamanında başlamadı.');
}

// ─── Main window ───────────────────────────────────────────────────────────────

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 1000,
    minWidth: 1280,
    minHeight: 800,
    backgroundColor: '#040412',
    autoHideMenuBar: true,
    title: 'Anatolia Sim',
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

  mainWindow.on('closed', () => { mainWindow = null; });
}

function startVersionWatcher() {
  if (versionWatcher) clearInterval(versionWatcher);
  versionWatcher = setInterval(async () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    try {
      const res = await fetch(`${LOCAL_URL}/api/health`, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      if (!knownVersion) { knownVersion = data.version ?? null; return; }
      if (data.version && data.version !== knownVersion) {
        knownVersion = data.version;
        mainWindow.reload();
      }
    } catch {}
  }, 60_000);
}

// ─── Boot ──────────────────────────────────────────────────────────────────────

async function boot() {
  if (!existsSync(CLIENT_INDEX)) {
    await dialog.showErrorBox(
      'Anatolia Sim',
      'Client build bulunamadı. Kurulum bozulmuş olabilir.'
    );
    app.quit();
    return;
  }

  // First-run setup if no config exists
  let cfg = loadConfig();
  if (!cfg) {
    cfg = await showSetupWindow();
    if (!cfg) {
      // User closed setup window without saving
      app.quit();
      return;
    }
  }

  // Ensure local DB dir if offline mode
  if (cfg.DESKTOP_LOCAL_DB === '1' || !cfg.DATABASE_URL) {
    mkdirSync(join(app.getPath('userData'), 'db'), { recursive: true });
  }

  await ensureLocalServer(cfg);
  createMainWindow();
  await mainWindow.loadURL(LOCAL_URL);
  startVersionWatcher();
}

// ─── App lifecycle ─────────────────────────────────────────────────────────────

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
    mkdirSync(app.getPath('userData'), { recursive: true });
    boot().catch(err => {
      console.error('[desktop] başlatma hatası:', err);
      dialog.showErrorBox('Anatolia Sim', err?.message ?? String(err));
      app.quit();
    });
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  app.isQuiting = true;
  if (versionWatcher) { clearInterval(versionWatcher); versionWatcher = null; }
  if (serverProcess && !serverProcess.killed) serverProcess.kill('SIGTERM');
});
