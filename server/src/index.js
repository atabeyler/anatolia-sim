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

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3001'],
  credentials: true,
}));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 500 }));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

app.use('/api/auth', authRouter);
app.use('/api/simulations', simulationsRouter);
app.use('/api/god', godRouter);
app.use('/api/analysis', analysisRouter);
app.use('/api/aria', ariaRouter);
app.use('/api/admin', adminRouter);
app.get('/api/health', (_, res) => res.json({ status: 'ok', version: '1.0.0' }));

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
  } catch {
    ws.close(1008, 'Invalid token');
  }
  ws.on('error', console.error);
});

async function main() {
  try {
    await migrate();
    server.listen(PORT, () => {
      console.log(`✅ ANATOLİA-SİM Server running on port ${PORT}`);
      console.log(`✅ WebSocket server ready`);
    });
  } catch (err) { console.error('Failed to start server:', err); process.exit(1); }
}

main();
