import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import { spawn, execFile } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { cpus } from 'node:os';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT ?? 3001);
const LOCAL_URL = `http://127.0.0.1:${PORT}`;

const isPackaged = app.isPackaged;
const RESOURCES = isPackaged ? process.resourcesPath : resolve(__dirname, '..');
const SERVER_ROOT = resolve(RESOURCES, 'server');
const SERVER_ENTRY = resolve(SERVER_ROOT, 'src/index.js');
const CLIENT_DIST = resolve(RESOURCES, 'client/dist');
const CLIENT_INDEX = resolve(CLIENT_DIST, 'index.html');
const CONFIG_PATH = join(app.getPath('userData'), 'config.json');
// Bundled config: yazılan DATABASE_URL, build sırasında eklenir (kaynak kodda yok)
const BUNDLED_CONFIG_PATH = join(__dirname, 'bundled-config.json');

let mainWindow = null;
let serverProcess = null;
let versionWatcher = null;
let knownVersion = null;

// ─── Config ────────────────────────────────────────────────────────────────────

function loadConfig() {
  // Önce kullanıcının kaydettiği config'e bak
  try {
    if (existsSync(CONFIG_PATH)) {
      return JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
    }
  } catch {}
  // Sonra exe'ye gömülü config'e bak (setup ekranı gösterilmez)
  try {
    if (existsSync(BUNDLED_CONFIG_PATH)) {
      return JSON.parse(readFileSync(BUNDLED_CONFIG_PATH, 'utf8'));
    }
  } catch {}
  return null;
}

function saveConfig(cfg) {
  writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf8');
}

// ─── Auto Updater ──────────────────────────────────────────────────────────────

async function setupAutoUpdater() {
  if (!isPackaged) return; // Geliştirme ortamında çalıştırma

  try {
    const updaterModule = await import('electron-updater');
    const autoUpdater = updaterModule.autoUpdater ?? updaterModule.default?.autoUpdater ?? updaterModule.default;

    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;

    autoUpdater.on('update-available', async (info) => {
      if (!mainWindow || mainWindow.isDestroyed()) return;
      const { response } = await dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Update Available',
        message: `Anatolia Sim ${info.version} is available!`,
        detail: 'Download in the background? You will be notified when it is ready.',
        buttons: ['Yes, Download', 'Remind Me Later'],
        defaultId: 0,
      });

      if (response === 0) {
        autoUpdater.downloadUpdate();
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.setProgressBar(0.01);
          try { mainWindow.webContents.send('update-download-progress', { percent: 1 }); } catch {}
        }
      }
    });

    autoUpdater.on('download-progress', (progress) => {
      const pct = Math.round(progress.percent ?? 0);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.setProgressBar(pct / 100);
        try { mainWindow.webContents.send('update-download-progress', { percent: pct }); } catch {}
      }
    });

    autoUpdater.on('update-downloaded', (info) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.setProgressBar(-1);
        try { mainWindow.webContents.send('update-downloaded', { version: info?.version }); } catch {}
      }
    });

    ipcMain.on('update-install', () => {
      app.isQuiting = true;
      autoUpdater.quitAndInstall(true, true);
    });

    autoUpdater.on('update-not-available', () => {
      // Otomatik kontrol sessiz geçer; sadece manuel kontrol dialog gösterir
    });

    autoUpdater.on('error', (err) => {
      console.error('[updater] error:', err?.message);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.setTitle('Anatolia Sim');
        mainWindow.setProgressBar(-1);
        dialog.showMessageBox(mainWindow, {
          type: 'error',
          title: 'Update Error',
          message: 'Could not check for updates:',
          detail: err?.message ?? String(err),
          buttons: ['OK'],
        }).catch(() => {});
      }
    });

    // Ana pencere yüklendikten 5 saniye sonra kontrol et
    setTimeout(() => autoUpdater.checkForUpdates(), 5000);
  } catch (err) {
    console.error('[updater] failed to start:', err?.message);
    if (mainWindow && !mainWindow.isDestroyed()) {
      dialog.showMessageBox(mainWindow, {
        type: 'error',
        title: 'Updater Failed',
        message: 'Auto-updater could not be loaded:',
        detail: err?.message ?? String(err),
        buttons: ['OK'],
      }).catch(() => {});
    }
  }
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
      title: 'Anatolia Sim — Setup',
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        preload: join(__dirname, 'preload.cjs'),
      },
    });

    setupWin.loadFile(join(__dirname, 'setup.html'));

    const onSetupSave = (_event, config) => {
      saveConfig(config);
      setupWin.close();
      resolve(config);
    };
    ipcMain.once('setup-save', onSetupSave);

    setupWin.on('closed', () => {
      ipcMain.removeListener('setup-save', onSetupSave);
      resolve(null);
    });
  });
}

// ─── Location ──────────────────────────────────────────────────────────────────

ipcMain.handle('get-location', () => new Promise(resolve => {
  dialog.showMessageBox({
    type: 'question',
    title: 'Location Access',
    message: 'Anatolia Sim wants to access your location.',
    detail: 'Your coordinates will be displayed on the login screen. No data is stored or transmitted to any server.',
    buttons: ['Allow', 'Deny'],
    defaultId: 0,
    cancelId: 1,
  }).then(({ response }) => {
    if (response !== 0) { resolve(null); return; }

    if (process.platform === 'win32') {
      const ps = `
        try {
          Add-Type -AssemblyName System.Device
          $w = New-Object System.Device.Location.GeoCoordinateWatcher([System.Device.Location.GeoPositionAccuracy]::High)
          $w.Start()
          $end = (Get-Date).AddSeconds(8)
          while ((Get-Date) -lt $end -and $w.Status -ne 'Ready') { Start-Sleep -Milliseconds 200 }
          if ($w.Position.Location.IsUnknown) { Write-Output 'null' }
          else { Write-Output "$($w.Position.Location.Latitude),$($w.Position.Location.Longitude)" }
          $w.Stop()
        } catch { Write-Output 'null' }
      `;
      execFile('powershell', ['-NoProfile', '-NonInteractive', '-Command', ps], { timeout: 12000 }, (err, stdout) => {
        if (err || !stdout) { resolve(null); return; }
        const parts = stdout.trim().split(',');
        if (parts.length === 2) {
          const lat = parseFloat(parts[0]), lon = parseFloat(parts[1]);
          resolve(isNaN(lat) || isNaN(lon) ? null : { lat, lon });
        } else { resolve(null); }
      });
    } else if (process.platform === 'darwin') {
      const swift = `
import CoreLocation
class D: NSObject, CLLocationManagerDelegate {
  let m = CLLocationManager()
  override init() { super.init(); m.delegate = self; m.requestWhenInUseAuthorization(); m.startUpdatingLocation() }
  func locationManager(_ m: CLLocationManager, didUpdateLocations l: [CLLocation]) {
    print("\\(l[0].coordinate.latitude),\\(l[0].coordinate.longitude)"); exit(0)
  }
  func locationManager(_ m: CLLocationManager, didFailWithError e: Error) { print("null"); exit(1) }
}
let d = D(); RunLoop.main.run()
      `;
      const tmp = join(app.getPath('temp'), 'loc.swift');
      writeFileSync(tmp, swift, 'utf8');
      execFile('swift', [tmp], { timeout: 12000 }, (err, stdout) => {
        if (err || !stdout) { resolve(null); return; }
        const parts = stdout.trim().split(',');
        if (parts.length === 2) {
          const lat = parseFloat(parts[0]), lon = parseFloat(parts[1]);
          resolve(isNaN(lat) || isNaN(lon) ? null : { lat, lon });
        } else { resolve(null); }
      });
    } else {
      resolve(null);
    }
  }).catch(() => resolve(null));
}));

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
  const desktopHeapMb = String(cfg?.DESKTOP_SERVER_HEAP_MB || process.env.DESKTOP_SERVER_HEAP_MB || 768);
  const defaultDesktopWorkers = Math.min(4, Math.max(1, Math.floor(cpus().length / 2)));
  const desktopMaxWorkers = String(cfg?.MAX_WORKERS || process.env.DESKTOP_MAX_WORKERS || defaultDesktopWorkers);
  const env = {
    ...process.env,
    ELECTRON_RUN_AS_NODE: '1',
    PORT: String(PORT),
    CLIENT_URL: LOCAL_URL,
    NODE_ENV: 'production',
    MAX_WORKERS: desktopMaxWorkers,
  };

  const nodeOptions = env.NODE_OPTIONS ?? '';
  if (!/--max-old-space-size=/.test(nodeOptions)) {
    env.NODE_OPTIONS = `${nodeOptions} --max-old-space-size=${desktopHeapMb}`.trim();
  }

  if (useLocalDb) {
    env.DESKTOP_LOCAL_DB = '1';
    env.PGLITE_DATA_DIR = join(app.getPath('userData'), 'db');
  } else {
    env.DATABASE_URL = cfg.DATABASE_URL;
  }

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
      console.warn(`[desktop] sunucu kapandı (${code ?? 'null'}, ${signal ?? '-'}) — yeniden başlatılıyor`);
      setTimeout(async () => {
        try {
          await ensureLocalServer(cfg);
          if (mainWindow && !mainWindow.isDestroyed()) mainWindow.reload();
        } catch (err) {
          console.error('[desktop] yeniden başlatma hatası:', err);
        }
      }, 2000);
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
      preload: join(__dirname, 'preload.cjs'),
    },
  });

  // Allow Google Fonts and other external style/font sources
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; " +
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
          "font-src 'self' https://fonts.gstatic.com; " +
          "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
          "img-src 'self' data: blob: https://raw.githubusercontent.com; " +
          "connect-src 'self' http://127.0.0.1:3001 ws://127.0.0.1:3001;"
        ],
      },
    });
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
        if (!mainWindow || mainWindow.isDestroyed()) return;
        const { response } = await dialog.showMessageBox(mainWindow, {
          type: 'info',
          title: 'Application Updated',
          message: `Anatolia Sim has been updated to ${data.version}.`,
          detail: 'Reload the app now to apply the update?',
          buttons: ['Reload Now', 'Later'],
          defaultId: 0,
        });
        if (response === 0 && mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.reload();
        }
      }
    } catch {}
  }, 60_000);
}

// ─── Boot ──────────────────────────────────────────────────────────────────────

async function boot() {
  if (!existsSync(CLIENT_INDEX)) {
    await dialog.showErrorBox('Anatolia Sim', 'Client build bulunamadı. Kurulum bozulmuş olabilir.');
    app.quit();
    return;
  }

  let cfg = loadConfig();
  if (!cfg) {
    cfg = await showSetupWindow();
    if (!cfg) { app.quit(); return; }
  }

  if (cfg.DESKTOP_LOCAL_DB === '1' || !cfg.DATABASE_URL) {
    mkdirSync(join(app.getPath('userData'), 'db'), { recursive: true });
  }

  // Show main window immediately with a loading screen so the user sees feedback
  // while the server subprocess starts (can take up to 90 s on first PGLite boot).
  createMainWindow();
  await mainWindow.loadFile(join(__dirname, 'loading.html'));

  await ensureLocalServer(cfg);
  await mainWindow.loadURL(LOCAL_URL);
  startVersionWatcher();
  setupAutoUpdater();
}

// ─── App lifecycle ─────────────────────────────────────────────────────────────

// Prevent WebGL context from being lost under memory pressure
app.commandLine.appendSwitch('disable-gpu-process-crash-limit');
app.commandLine.appendSwitch('enable-unsafe-webgpu');

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
