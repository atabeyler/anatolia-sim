import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../../db/database.js';

const router = Router();
const BCRYPT_ROUNDS = 12;

router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) return res.status(400).json({ error: 'Username, email and password required' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const { rows } = await query(`INSERT INTO users (username, email, password_hash, email_verification_token) VALUES ($1,$2,$3,$4) RETURNING id, username, email`, [username.trim(), email.toLowerCase().trim(), hash, uuidv4()]);
    res.status(201).json({ user: rows[0], message: 'Registration successful.' });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Username or email already exists' });
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const { rows } = await query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) return res.status(401).json({ error: 'Invalid credentials' });
    const accessToken = jwt.sign({ id: user.id, username: user.username, email: user.email }, process.env.JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ id: user.id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '30d' });
    res.cookie('refresh_token', refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 30*24*60*60*1000 });
    res.json({ access_token: accessToken, user: { id: user.id, username: user.username, email: user.email } });
  } catch { res.status(500).json({ error: 'Login failed' }); }
});

router.post('/refresh', async (req, res) => {
  try {
    const token = req.cookies?.refresh_token;
    if (!token) return res.status(401).json({ error: 'No refresh token' });
    const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const { rows } = await query('SELECT id, username, email FROM users WHERE id = $1', [payload.id]);
    if (!rows[0]) return res.status(401).json({ error: 'User not found' });
    res.json({ access_token: jwt.sign(rows[0], process.env.JWT_SECRET, { expiresIn: '15m' }) });
  } catch { res.status(401).json({ error: 'Invalid refresh token' }); }
});

router.post('/logout', (req, res) => { res.clearCookie('refresh_token'); res.json({ message: 'Logged out' }); });

export default router;
