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

export async function requireSimulationOwner(req, res, next) {
  try {
    const simId = req.params.id ?? req.params.simId;
    const { rows } = await query(
      'SELECT * FROM simulations WHERE id = $1 AND user_id = $2',
      [simId, req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Simulation not found' });
    req.simulation = rows[0];
    next();
  } catch (err) {
    console.error('Simulation ownership check failed:', err);
    res.status(500).json({ error: 'Failed to verify simulation access' });
  }
}
