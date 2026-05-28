import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { migrate } from './db/database.js';
import authRouter from './api/routes/auth.js';
import simulationsRouter from './api/routes/simulations.js';
import godRouter from './api/routes/god.js';
import analysisRouter from './api/routes/analysis.js';
import ariaRouter from './api/routes/aria.js';
import { simulationManager } from './api/simulationManager.js';

const app = express();
const server = createServer(app);
const PORT = process.env.PORT ?? 3001;

app.use(helmet());
const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:5173',
  'https://anatolia-sim-client.onrender.com',
].filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('CORS: ' + origin + ' not allowed'));
  },
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
app.get('/api/health', (_, res) => res.json({ status: 'ok', version: '1.0.0' }));

const wss = new WebSocketServer({ server, path: '/ws' });
wss.on('connection', (ws, req) => {
  const simId = new URL(req.url, 'http://localhost').searchParams.get('simId');
  if (simId) simulationManager.registerWs(simId, ws);
  ws.on('error', console.error);
});

async function main() {
  try {
    await migrate();
    server.listen(PORT, () => {
      console.log(`✅ ANTİLİA-SİM Server running on port ${PORT}`);
      console.log(`✅ WebSocket server ready`);
    });
  } catch (err) { console.error('Failed to start server:', err); process.exit(1); }
}

main();
