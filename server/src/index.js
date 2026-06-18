import 'dotenv/config';
import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import { migrate } from './db/database.js';
import authRouter from './api/routes/auth.js';
import simulationsRouter from './api/routes/simulations.js';
import godRouter from './api/routes/god.js';
import analysisRouter from './api/routes/analysis.js';
import ariaRouter from './api/routes/aria.js';
import adminRouter from './api/routes/admin.js';
import { simulationManager } from './api/simulationManager.js';
import pool, { query } from './db/database.js';
import { verifyAccessToken } from './api/middleware/auth.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const clientDist = join(__dirname, '../../client/dist');

const app = express();
const server = createServer(app);
const PORT = process.env.PORT ?? 3001;

app.set('trust proxy', 1);
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'", "'unsafe-inline'"],   // Vite build inline chunks
      styleSrc:   ["'self'", "'unsafe-inline'"],   // Tailwind/CSS-in-JS
      connectSrc: ["'self'", "wss:", "ws:",
                   "https://generativelanguage.googleapis.com"], // Gemini API
      imgSrc:     ["'self'", "data:", "blob:", "https://raw.githubusercontent.com"],
      fontSrc:    ["'self'", "data:"],
      workerSrc:  ["'self'", "blob:"],              // Three.js workers
      objectSrc:  ["'none'"],
    },
  },
}));
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3001',
  process.env.CLIENT_URL,
  process.env.RENDER_EXTERNAL_URL,
].filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    // Allow server-to-server, health checks, and same-origin requests with no Origin header.
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin '${origin}' not allowed`));
  },
  credentials: true,
}));
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  handler: (req, res) => {
    console.warn('Rate limit hit:', req.ip, req.path);
    res.status(429).json({ text: 'Rate limit (900s)', actions: [], retry_after: 900 });
  },
}));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

app.use('/api/auth', authRouter);
app.use('/api/simulations', simulationsRouter);
app.use('/api/god', godRouter);
app.use('/api/analysis', analysisRouter);
app.use('/api/aria', ariaRouter);
app.use('/api/admin', adminRouter);
const BUILD_VERSION = process.env.RENDER_GIT_COMMIT ?? process.env.BUILD_VERSION ?? Date.now().toString();
app.get('/api/health', (_, res) => res.json({ status: 'ok', version: BUILD_VERSION }));
app.get('/', (_, res) => res.json({ status: 'ok' }));

// Public system status — no auth required; consumed by the login page status panel
app.get('/api/system/status', async (_, res) => {
  try {
    const [simRes, popRes] = await Promise.all([
      query("SELECT COUNT(*) FROM simulations WHERE status = 'running'"),
      query('SELECT COUNT(*) FROM individuals WHERE alive = true'),
    ]);
    res.json({
      status: 'online',
      genome_loci: 32,
      epi_loci: 8,
      lang_stages: 7,
      active_sims: parseInt(simRes.rows[0].count, 10),
      total_population: parseInt(popRes.rows[0].count, 10),
    });
  } catch {
    res.json({ status: 'degraded', genome_loci: 32, epi_loci: 8, lang_stages: 7, active_sims: 0, total_population: 0 });
  }
});

if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/ws')) return next();
    res.sendFile(join(clientDist, 'index.html'));
  });
}

const wss = new WebSocketServer({ server, path: '/ws' });
wss.on('connection', (ws, req) => {
  const params = new URL(req.url, 'http://localhost').searchParams;
  const simId = params.get('simId');
  if (!simId) return ws.close(1008, 'simId required');

  // Token must arrive in the first message, never in the URL (URL is logged by proxies/CDNs).
  const authTimeout = setTimeout(() => ws.close(1008, 'Authentication timeout'), 5000);

  ws.once('message', async (raw) => {
    clearTimeout(authTimeout);
    try {
      const { type, token } = JSON.parse(raw);
      if (type !== 'auth' || !token) return ws.close(1008, 'Authentication required');
      const user = verifyAccessToken(token);
      const { rows } = await query('SELECT id FROM simulations WHERE id = $1 AND user_id = $2', [simId, user.id]);
      if (!rows[0]) return ws.close(1008, 'Simulation not found');
      simulationManager.registerWs(simId, ws);
      // Tell the client the actual engine state so it can auto-recover after a server restart.
      const eng = simulationManager.getEngine(simId);
      try { ws.send(JSON.stringify({ type: 'status', engine_running: eng?.running === true })); } catch {}
    } catch {
      ws.close(1008, 'Invalid token');
    }
  });

  ws.on('error', console.error);
});

async function seedAdminIfNeeded() {
  const code = (process.env.ADMIN_USER_CODE ?? '').toUpperCase().trim();
  const pass = process.env.ADMIN_PASSWORD;
  const email = process.env.ADMIN_EMAIL ?? '';
  if (!code || !pass) return;
  try {
    const bcrypt = (await import('bcrypt')).default;
    const hash = await bcrypt.hash(pass, 12);
    // Try UPDATE by user_code first
    let upd = await query(
      `UPDATE users SET role='admin', is_approved=true, is_banned=false, password_hash=$2, username=$1
       WHERE user_code=$1`,
      [code, hash]
    );
    if (upd.rowCount > 0) { console.log(`✅ Admin güncellendi: ${code}`); return; }
    // Try UPDATE by email
    if (email) {
      upd = await query(
        `UPDATE users SET role='admin', is_approved=true, is_banned=false, password_hash=$2, username=$1, user_code=$1
         WHERE email=$3`,
        [code, hash, email]
      );
      if (upd.rowCount > 0) { console.log(`✅ Admin (email) güncellendi: ${code}`); return; }
    }
    // Fresh INSERT
    const adminEmail = email || `${code}@admin.local`;
    await query(
      `INSERT INTO users (user_code, username, first_name, last_name, email, password_hash, role, is_approved)
       VALUES ($1,$1,'Admin','Yönetici',$2,$3,'admin',true)`,
      [code, adminEmail, hash]
    );
    console.log(`✅ Admin oluşturuldu: ${code}`);
  } catch (err) {
    console.error('⚠️ Admin seed hatası:', err.message);
  }
}

async function main() {
  // Portu hemen aç: Render health check beklemeye başlamadan önce yanıt almalı.
  // DB migration arka planda çalışır; hazır olmadan gelen API istekleri DB hataları döner (kabul edilebilir).
  server.listen(PORT, () => {
    console.log(`✅ ANATOLİA-SİM Server running on port ${PORT}`);
    console.log(`✅ WebSocket server ready`);
  });

  const delays = [2000, 4000, 8000, 16000];
  let migrated = false;
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      await migrate();
      migrated = true;
      break;
    } catch (err) {
      if (attempt < delays.length) {
        console.error(`DB connect failed (attempt ${attempt + 1}), retrying in ${delays[attempt] / 1000}s:`, err.message);
        await new Promise(r => setTimeout(r, delays[attempt]));
      } else {
        console.error('Failed to migrate database after all retries. Running in degraded mode:', err.message);
      }
    }
  }

  if (migrated) {
    console.log('✅ Database migrated successfully');
    await seedAdminIfNeeded();
  } else {
    console.warn('⚠️ Database unavailable; running in degraded mode');
  }
}

main();

function shutdown(signal) {
  console.log(`${signal} alındı — graceful shutdown başlıyor`);
  server.close(() => {
    pool.end(() => {
      console.log('Sunucu ve veritabanı bağlantısı kapatıldı.');
      process.exit(0);
    });
  });
  setTimeout(() => { console.error('Zorla kapatılıyor'); process.exit(1); }, 8000);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
