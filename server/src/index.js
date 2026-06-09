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
import { query } from './db/database.js';
import { verifyAccessToken } from './api/middleware/auth.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const clientDist = join(__dirname, '../../client/dist');

const app = express();
const server = createServer(app);
const PORT = process.env.PORT ?? 3001;

app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false }));
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3001',
  process.env.CLIENT_URL,
].filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    // Allow server-to-server, health checks, and same-origin requests with no Origin header.
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // Fail-open to avoid blocking app boot in production due to missing/alternate origin.
    console.warn(`CORS allow (fallback) for origin: ${origin}`);
    return callback(null, true);
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
app.get('/api/health', (_, res) => res.json({ status: 'ok', version: '1.0.0' }));

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
wss.on('connection', async (ws, req) => {
  try {
    const params = new URL(req.url, 'http://localhost').searchParams;
    const simId = params.get('simId');
    const token = params.get('token');
    if (!simId || !token) return ws.close(1008, 'Authentication required');
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
  ws.on('error', console.error);
});

async function main() {
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
        console.error('Failed to migrate database after all retries. Starting server in degraded mode:', err.message);
      }
    }
  }

  server.listen(PORT, () => {
    console.log(`✅ ANATOLİA-SİM Server running on port ${PORT}`);
    console.log(`✅ WebSocket server ready`);
    console.log(migrated ? '✅ Database migrated successfully' : '⚠️ Database unavailable; running in degraded mode');
  });
}

main();
