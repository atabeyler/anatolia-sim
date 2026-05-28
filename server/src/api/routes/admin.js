import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { query } from '../../db/database.js';
import { sendApprovalEmail, sendRejectionEmail } from '../../utils/email.js';

const router = Router();

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Yönetici yetkisi gerekli.' });
  next();
}

router.get('/users', authenticate, requireAdmin, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT id, user_code, first_name, last_name, tc_no, email, role, is_approved, is_banned, ban_reason, created_at
       FROM users ORDER BY created_at DESC`
    );
    res.json(rows);
  } catch { res.status(500).json({ error: 'Kullanıcılar alınamadı.' }); }
});

router.post('/users/:id/approve', authenticate, requireAdmin, async (req, res) => {
  try {
    const { rows } = await query(
      `UPDATE users SET is_approved=true, role='user', updated_at=NOW()
       WHERE id=$1 RETURNING id, user_code, first_name, last_name, email`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
    await sendApprovalEmail(rows[0]);
    res.json({ message: 'Kullanıcı onaylandı.', user: rows[0] });
  } catch { res.status(500).json({ error: 'Onay başarısız.' }); }
});

router.post('/users/:id/reject', authenticate, requireAdmin, async (req, res) => {
  try {
    const { rows } = await query(
      `DELETE FROM users WHERE id=$1 AND is_approved=false RETURNING first_name, last_name, email`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Kullanıcı bulunamadı veya zaten onaylı.' });
    await sendRejectionEmail(rows[0]);
    res.json({ message: 'Talep reddedildi.' });
  } catch { res.status(500).json({ error: 'Red işlemi başarısız.' }); }
});

router.post('/users/:id/ban', authenticate, requireAdmin, async (req, res) => {
  try {
    const { reason } = req.body;
    const { rows } = await query(
      `UPDATE users SET is_banned=true, ban_reason=$2, updated_at=NOW() WHERE id=$1 RETURNING user_code, first_name, last_name`,
      [req.params.id, reason ?? null]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
    res.json({ message: 'Kullanıcı engellendi.' });
  } catch { res.status(500).json({ error: 'Engelleme başarısız.' }); }
});

router.post('/users/:id/unban', authenticate, requireAdmin, async (req, res) => {
  try {
    const { rows } = await query(
      `UPDATE users SET is_banned=false, ban_reason=NULL, updated_at=NOW() WHERE id=$1 RETURNING user_code`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
    res.json({ message: 'Engel kaldırıldı.' });
  } catch { res.status(500).json({ error: 'Engel kaldırma başarısız.' }); }
});

router.delete('/users/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    await query('DELETE FROM users WHERE id=$1', [req.params.id]);
    res.json({ message: 'Kullanıcı silindi.' });
  } catch { res.status(500).json({ error: 'Silme başarısız.' }); }
});

// Seed first admin from env var
router.post('/seed-admin', async (req, res) => {
  try {
    const adminCode = process.env.ADMIN_USER_CODE;
    const adminPass = process.env.ADMIN_PASSWORD;
    if (!adminCode || !adminPass) return res.status(400).json({ error: 'ADMIN_USER_CODE ve ADMIN_PASSWORD env var gerekli.' });
    const bcrypt = (await import('bcrypt')).default;
    const hash = await bcrypt.hash(adminPass, 12);
    await query(
      `INSERT INTO users (user_code, username, first_name, last_name, email, password_hash, role, is_approved)
       VALUES ($1,$1,'Admin','Yönetici',$2,$3,'admin',true)
       ON CONFLICT (user_code) DO UPDATE SET role='admin', is_approved=true`,
      [adminCode, process.env.ADMIN_EMAIL ?? 'info@boldkimya.com.tr', hash]
    );
    res.json({ message: 'Admin oluşturuldu.' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Admin oluşturulamadı.' }); }
});

export default router;
