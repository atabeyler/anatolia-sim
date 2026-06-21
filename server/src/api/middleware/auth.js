import jwt from 'jsonwebtoken';
import { query } from '../../db/database.js';

export function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

export function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Authentication required' });
  try {
    req.user = verifyAccessToken(header.slice(7));
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Cache sim ownership for 30s to avoid a DB query on every poll request
const simOwnerCache = new Map(); // key: `${userId}:${simId}` → { sim, expiresAt }

export async function requireSimulationOwner(req, res, next) {
  try {
    const simId = req.params.id ?? req.params.simId;
    const cacheKey = `${req.user.id}:${simId}`;
    const cached = simOwnerCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      req.simulation = cached.sim;
      return next();
    }
    const { rows } = await query(
      'SELECT * FROM simulations WHERE id = $1 AND user_id = $2',
      [simId, req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Simulation not found' });
    simOwnerCache.set(cacheKey, { sim: rows[0], expiresAt: Date.now() + 30_000 });
    req.simulation = rows[0];
    next();
  } catch (err) {
    console.error('Simulation ownership check failed:', err);
    res.status(500).json({ error: 'Failed to verify simulation access' });
  }
}
