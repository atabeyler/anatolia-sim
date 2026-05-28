import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { authenticate } from '../middleware/auth.js';
import { query } from '../../db/database.js';
import { sendApprovalEmail, sendRejectionEmail, sendTestEmail, APP_URL } from '../../utils/email.js';

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

const pageHtml = (user, token, msg) => `<!DOCTYPE html>
<html lang="tr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>ANATOLİA-SİM — Kayıt İnceleme</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#030310;color:#c8d4f0;font-family:'Courier New',monospace;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
  .card{background:#0a0a1e;border:1px solid rgba(79,110,247,0.35);padding:36px 32px;max-width:420px;width:100%}
  h1{font-size:11px;letter-spacing:.3em;color:#4f6ef7;margin-bottom:24px;text-transform:uppercase}
  .row{display:flex;gap:8px;margin-bottom:10px;font-size:13px}
  .label{color:#6070a0;min-width:110px;flex-shrink:0}
  .val{color:#e0e8ff;font-weight:bold;word-break:break-all}
  .divider{border:none;border-top:1px solid rgba(79,110,247,0.15);margin:24px 0}
  .btns{display:flex;gap:12px}
  a.btn{flex:1;display:block;padding:12px;font-family:inherit;font-size:13px;letter-spacing:.15em;text-align:center;text-decoration:none;border:1px solid;transition:.2s}
  a.approve{background:rgba(78,203,113,0.15);border-color:rgba(78,203,113,0.5);color:#4ecb71}
  a.approve:hover{background:rgba(78,203,113,0.28)}
  a.reject{background:rgba(224,90,90,0.15);border-color:rgba(224,90,90,0.5);color:#e05a5a}
  a.reject:hover{background:rgba(224,90,90,0.28)}
  .msg{padding:14px;border-left:3px solid;font-size:13px;margin-bottom:20px}
  .msg.ok{border-color:#4ecb71;background:rgba(78,203,113,0.08);color:#4ecb71}
  .msg.err{border-color:#e05a5a;background:rgba(224,90,90,0.08);color:#e05a5a}
  .back{display:block;margin-top:20px;text-align:center;font-size:11px;letter-spacing:.2em;color:#4f6ef7;text-decoration:none}
</style></head>
<body><div class="card">
  <h1>⬡ ANATOLİA-SİM — Kayıt Talebi</h1>
  ${msg ? `<div class="msg ${msg.ok ? 'ok' : 'err'}">${msg.text}</div>` : ''}
  ${user ? `
  <div class="row"><span class="label">Ad Soyad</span><span class="val">${user.first_name} ${user.last_name}</span></div>
  <div class="row"><span class="label">TC No</span><span class="val">${user.tc_no ?? '—'}</span></div>
  <div class="row"><span class="label">E-posta</span><span class="val">${user.email}</span></div>
  <div class="row"><span class="label">Kullanıcı Kodu</span><span class="val">${user.user_code}</span></div>
  <div class="row"><span class="label">Kayıt Tarihi</span><span class="val">${new Date(user.created_at).toLocaleString('tr-TR')}</span></div>
  <hr class="divider">
  <div class="btns">
    <a class="btn approve" href="/api/admin/quick-approve/${token}">✔ ONAYLA</a>
    <a class="btn reject" href="/api/admin/quick-reject/${token}">✘ REDDET</a>
  </div>` : ''}
  <a class="back" href="${APP_URL}/admin">← YÖNETİM PANELİ</a>
</div></body></html>`;

// Review page — shows user info with approve/reject links
router.get('/review/:token', async (req, res) => {
  try {
    const payload = jwt.verify(req.params.token, process.env.JWT_SECRET);
    if (payload.action !== 'approve') return res.status(400).send(pageHtml(null, '', { ok: false, text: 'Geçersiz token türü.' }));
    const { rows } = await query(
      `SELECT id, user_code, first_name, last_name, tc_no, email, is_approved, created_at FROM users WHERE id=$1`,
      [payload.userId]
    );
    if (!rows[0]) return res.send(pageHtml(null, '', { ok: false, text: 'Kullanıcı bulunamadı.' }));
    if (rows[0].is_approved) return res.send(pageHtml(null, '', { ok: true, text: `${rows[0].first_name} ${rows[0].last_name} zaten onaylanmış.` }));
    res.send(pageHtml(rows[0], req.params.token, null));
  } catch (err) {
    const msg = err.name === 'TokenExpiredError'
      ? 'Bu onay linkinin süresi dolmuş (7 gün). Yönetim panelini kullanın.'
      : 'Geçersiz link. Yönetim panelinden onaylayın.';
    res.status(400).send(pageHtml(null, '', { ok: false, text: msg }));
  }
});

// Approve — GET link from review page
router.get('/quick-approve/:token', async (req, res) => {
  try {
    const payload = jwt.verify(req.params.token, process.env.JWT_SECRET);
    if (payload.action !== 'approve') throw new Error('bad');
    const { rows } = await query(
      `UPDATE users SET is_approved=true, role='user', updated_at=NOW()
       WHERE id=$1 AND is_approved=false RETURNING id, user_code, first_name, last_name, email`,
      [payload.userId]
    );
    if (!rows[0]) return res.send(pageHtml(null, '', { ok: true, text: 'Bu kullanıcı zaten onaylanmış.' }));
    try { await sendApprovalEmail(rows[0]); } catch (mailErr) { console.error('[APPROVE] Mail gönderilemedi:', mailErr.message); }
    res.send(pageHtml(null, '', { ok: true, text: `✔ ${rows[0].first_name} ${rows[0].last_name} onaylandı — kullanıcı kodu: ${rows[0].user_code}.` }));
  } catch (err) {
    const msg = err.name === 'TokenExpiredError' ? 'Link süresi dolmuş.' : 'Geçersiz link.';
    res.status(400).send(pageHtml(null, '', { ok: false, text: msg }));
  }
});

// Reject — GET link from review page
router.get('/quick-reject/:token', async (req, res) => {
  try {
    const payload = jwt.verify(req.params.token, process.env.JWT_SECRET);
    if (payload.action !== 'approve') throw new Error('bad');
    const { rows } = await query(
      `DELETE FROM users WHERE id=$1 AND is_approved=false RETURNING first_name, last_name, email`,
      [payload.userId]
    );
    if (!rows[0]) return res.send(pageHtml(null, '', { ok: false, text: 'Kullanıcı bulunamadı veya zaten onaylı.' }));
    try { await sendRejectionEmail(rows[0]); } catch (mailErr) { console.error('[REJECT] Mail gönderilemedi:', mailErr.message); }
    res.send(pageHtml(null, '', { ok: true, text: `✘ ${rows[0].first_name} ${rows[0].last_name} reddedildi.` }));
  } catch (err) {
    const msg = err.name === 'TokenExpiredError' ? 'Link süresi dolmuş.' : 'Geçersiz link.';
    res.status(400).send(pageHtml(null, '', { ok: false, text: msg }));
  }
});

// SMTP test — GET /api/admin/test-email (no auth, for debugging only)
router.get('/test-email', async (req, res) => {
  const timer = setTimeout(() => {
    if (!res.headersSent) res.status(504).json({ error: 'SMTP bağlantısı zaman aşımına uğradı (15s). Port 587 engellenmiş olabilir.' });
  }, 16000);
  try {
    await sendTestEmail();
    clearTimeout(timer);
    if (!res.headersSent) res.json({ message: `Test maili ${process.env.ADMIN_EMAIL ?? 'info@boldkimya.com.tr'} adresine gönderildi.` });
  } catch (err) {
    clearTimeout(timer);
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
});

// Seed first admin from env var
router.post('/seed-admin', async (req, res) => {
  try {
    const adminCode = process.env.ADMIN_USER_CODE;
    const adminPass = process.env.ADMIN_PASSWORD;
    const adminEmail = process.env.ADMIN_EMAIL ?? 'info@boldkimya.com.tr';
    if (!adminCode || !adminPass) return res.status(400).json({ error: 'ADMIN_USER_CODE ve ADMIN_PASSWORD env var gerekli.' });
    const bcrypt = (await import('bcrypt')).default;
    const hash = await bcrypt.hash(adminPass, 12);

    // Check if admin already exists
    const existing = await query('SELECT id FROM users WHERE user_code=$1 OR email=$2', [adminCode, adminEmail]);
    if (existing.rows.length > 0) {
      await query(`UPDATE users SET role='admin', is_approved=true, is_banned=false, password_hash=$1, user_code=$2, username=$2 WHERE user_code=$2 OR email=$3`,
        [hash, adminCode, adminEmail]);
      return res.json({ message: 'Admin güncellendi.' });
    }

    await query(
      `INSERT INTO users (user_code, username, first_name, last_name, email, password_hash, role, is_approved)
       VALUES ($1,$1,'Admin','Yönetici',$2,$3,'admin',true)`,
      [adminCode, adminEmail, hash]
    );
    res.json({ message: 'Admin oluşturuldu.' });
  } catch (err) {
    console.error('seed-admin error:', err.message, err.code);
    res.status(500).json({ error: 'Admin oluşturulamadı.', detail: err.message });
  }
});

export default router;
