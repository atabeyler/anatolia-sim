import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { query } from '../../db/database.js';
import { sendAdminRegistrationNotification, sendApprovalEmail } from '../../utils/email.js';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many registration attempts. Please try again in 1 hour.' },
});

const isDesktopLocalDb = process.env.DESKTOP_LOCAL_DB === '1' || process.env.DESKTOP_LOCAL_DB === 'true';

function generateApprovalToken(userId) {
  const secret = process.env.JWT_SECRET || 'anatolia-sim-local-approval-secret';
  return jwt.sign({ action: 'approve', userId }, secret, { expiresIn: '7d' });
}

const router = Router();
const BCRYPT_ROUNDS = 12;

function generateUserCode() {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const digits = '0123456789';
  let code = 'ANS';
  for (let i = 0; i < 2; i++) code += letters[Math.floor(Math.random() * letters.length)];
  for (let i = 0; i < 4; i++) code += digits[Math.floor(Math.random() * digits.length)];
  return code;
}

function validatePassword(password) {
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter.';
  if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter.';
  if (!/[0-9]/.test(password)) return 'Password must contain at least one digit.';
  if (!/[^A-Za-z0-9]/.test(password)) return 'Password must contain at least one punctuation/special character.';
  return null;
}

router.post('/register', registerLimiter, async (req, res) => {
  try {
    const { first_name, last_name, tc_no, email, password, user_code } = req.body;
    if (!first_name || !last_name || !tc_no || !email || !password || !user_code)
      return res.status(400).json({ error: 'All fields are required.' });
    if (!/^\d{11}$/.test(tc_no))
      return res.status(400).json({ error: 'National ID must be an 11-digit number.' });
    const code = user_code.toUpperCase().trim();
    if (!/^[A-Z0-9]{4,20}$/.test(code))
      return res.status(400).json({ error: 'User code must be 4-20 characters, letters and digits only.' });
    const pwErr = validatePassword(password);
    if (pwErr) return res.status(400).json({ error: pwErr });

    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const isApproved = isDesktopLocalDb;
    const role = isDesktopLocalDb ? 'user' : 'pending';

    const { rows } = await query(
      `INSERT INTO users (first_name, last_name, tc_no, email, password_hash, user_code, username, role, is_approved)
       VALUES ($1,$2,$3,$4,$5,$6,$6,$7,$8) RETURNING id, first_name, last_name, email, user_code`,
      [first_name.trim(), last_name.trim(), tc_no.trim(), email.toLowerCase().trim(), hash, code, role, isApproved]
    );

    if (!isDesktopLocalDb) {
      const approvalToken = generateApprovalToken(rows[0].id);
      await sendAdminRegistrationNotification({ first_name, last_name, tc_no, email, user_code_temp: code, approvalToken });
      return res.status(201).json({ message: 'Your registration request has been received. Awaiting admin approval.' });
    }

    res.status(201).json({ message: 'Registration complete. You can sign in now.' });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'This email, national ID, or user code is already registered.' });
    console.error(err);
    res.status(500).json({ error: 'Registration failed.' });
  }
});

router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { user_code, password } = req.body;
    if (!user_code || !password) return res.status(400).json({ error: 'User code and password are required.' });

    const { rows } = await query('SELECT * FROM users WHERE user_code = $1', [user_code.toUpperCase().trim()]);
    const user = rows[0];

    if (!user || !(await bcrypt.compare(password, user.password_hash)))
      return res.status(401).json({ error: 'Invalid user code or password.' });
    if (!user.is_approved && !isDesktopLocalDb)
      return res.status(403).json({ error: 'Your account has not been approved yet. Please wait for admin approval.' });
    if (user.is_banned)
      return res.status(403).json({ error: `Your account has been banned.${user.ban_reason ? ' Reason: ' + user.ban_reason : ''}` });

    const payload = { id: user.id, username: user.user_code, email: user.email, role: user.role };
    const accessSecret = process.env.JWT_SECRET || 'anatolia-sim-local-access-secret';
    const refreshSecret = process.env.JWT_REFRESH_SECRET || 'anatolia-sim-local-refresh-secret';
    const accessToken = jwt.sign(payload, accessSecret, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ id: user.id }, refreshSecret, { expiresIn: '30d' });
    const isProd = process.env.NODE_ENV === 'production' || !!process.env.RENDER;
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    res.json({
      access_token: accessToken,
      user: { id: user.id, username: user.user_code, email: user.email, role: user.role, first_name: user.first_name, last_name: user.last_name },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed.' });
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const token = req.cookies?.refresh_token;
    if (!token) return res.status(401).json({ error: 'Session expired.' });
    const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET || 'anatolia-sim-local-refresh-secret');
    const { rows } = await query('SELECT id, user_code, email, role, first_name, last_name, is_banned, is_approved FROM users WHERE id = $1', [payload.id]);
    const user = rows[0];
    if (!user || user.is_banned || !user.is_approved) return res.status(401).json({ error: 'Invalid session.' });
    const accessToken = jwt.sign(
      { id: user.id, username: user.user_code, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'anatolia-sim-local-access-secret', { expiresIn: '15m' }
    );
    res.json({ access_token: accessToken, user: { id: user.id, username: user.user_code, email: user.email, role: user.role, first_name: user.first_name, last_name: user.last_name } });
  } catch {
    res.status(401).json({ error: 'Invalid session.' });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('refresh_token');
  res.json({ message: 'Logged out.' });
});

router.get('/pending-status/:userCode', async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT is_approved, is_banned FROM users WHERE user_code=$1',
      [req.params.userCode.toUpperCase()]
    );
    if (!rows[0]) return res.json({ status: 'not_found' });
    if (rows[0].is_banned) return res.json({ status: 'banned' });
    if (rows[0].is_approved) return res.json({ status: 'approved' });
    res.json({ status: 'pending' });
  } catch { res.json({ status: 'error' }); }
});

export default router;
