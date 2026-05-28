import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from '../../db/database.js';
import { sendAdminRegistrationNotification, sendApprovalEmail } from '../../utils/email.js';

function generateApprovalToken(userId) {
  return jwt.sign({ action: 'approve', userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
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
  if (password.length < 8) return 'Şifre en az 8 karakter olmalıdır.';
  if (!/[A-Z]/.test(password)) return 'Şifre en az bir büyük harf içermelidir.';
  if (!/[a-z]/.test(password)) return 'Şifre en az bir küçük harf içermelidir.';
  if (!/[0-9]/.test(password)) return 'Şifre en az bir rakam içermelidir.';
  if (!/[^A-Za-z0-9]/.test(password)) return 'Şifre en az bir noktalama/özel karakter içermelidir.';
  return null;
}

router.post('/register', async (req, res) => {
  try {
    const { first_name, last_name, tc_no, email, password, user_code } = req.body;
    if (!first_name || !last_name || !tc_no || !email || !password || !user_code)
      return res.status(400).json({ error: 'Tüm alanlar zorunludur.' });
    if (!/^\d{11}$/.test(tc_no))
      return res.status(400).json({ error: 'TC Kimlik No 11 haneli rakam olmalıdır.' });
    const code = user_code.toUpperCase().trim();
    if (!/^[A-Z0-9]{4,20}$/.test(code))
      return res.status(400).json({ error: 'Kullanıcı kodu 4-20 karakter, sadece harf ve rakam olmalıdır.' });
    const pwErr = validatePassword(password);
    if (pwErr) return res.status(400).json({ error: pwErr });

    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const { rows } = await query(
      `INSERT INTO users (first_name, last_name, tc_no, email, password_hash, user_code, username, role, is_approved)
       VALUES ($1,$2,$3,$4,$5,$6,$6,'pending',false) RETURNING id, first_name, last_name, email, user_code`,
      [first_name.trim(), last_name.trim(), tc_no.trim(), email.toLowerCase().trim(), hash, code]
    );

    const approvalToken = generateApprovalToken(rows[0].id);
    await sendAdminRegistrationNotification({ first_name, last_name, tc_no, email, user_code_temp: code, approvalToken });
    res.status(201).json({ message: 'Kayıt talebiniz alındı. Yönetim onayı bekleniyor.' });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Bu e-posta, TC No veya kullanıcı kodu zaten kayıtlı.' });
    console.error(err);
    res.status(500).json({ error: 'Kayıt başarısız.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { user_code, password } = req.body;
    if (!user_code || !password) return res.status(400).json({ error: 'Kullanıcı kodu ve şifre gereklidir.' });

    const { rows } = await query('SELECT * FROM users WHERE user_code = $1', [user_code.toUpperCase().trim()]);
    const user = rows[0];

    if (!user || !(await bcrypt.compare(password, user.password_hash)))
      return res.status(401).json({ error: 'Kullanıcı kodu veya şifre hatalı.' });
    if (!user.is_approved)
      return res.status(403).json({ error: 'Hesabınız henüz onaylanmamış. Lütfen yönetim onayını bekleyin.' });
    if (user.is_banned)
      return res.status(403).json({ error: `Hesabınız engellenmiştir.${user.ban_reason ? ' Sebep: ' + user.ban_reason : ''}` });

    const payload = { id: user.id, username: user.user_code, email: user.email, role: user.role };
    const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ id: user.id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '30d' });
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    res.json({
      access_token: accessToken,
      user: { id: user.id, username: user.user_code, email: user.email, role: user.role, first_name: user.first_name, last_name: user.last_name },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Giriş başarısız.' });
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const token = req.cookies?.refresh_token;
    if (!token) return res.status(401).json({ error: 'Oturum süresi doldu.' });
    const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const { rows } = await query('SELECT id, user_code, email, role, first_name, last_name, is_banned FROM users WHERE id = $1', [payload.id]);
    const user = rows[0];
    if (!user || user.is_banned) return res.status(401).json({ error: 'Geçersiz oturum.' });
    const accessToken = jwt.sign(
      { id: user.id, username: user.user_code, email: user.email, role: user.role },
      process.env.JWT_SECRET, { expiresIn: '15m' }
    );
    res.json({ access_token: accessToken, user: { id: user.id, username: user.user_code, email: user.email, role: user.role, first_name: user.first_name, last_name: user.last_name } });
  } catch {
    res.status(401).json({ error: 'Geçersiz oturum.' });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('refresh_token');
  res.json({ message: 'Çıkış yapıldı.' });
});

export default router;
