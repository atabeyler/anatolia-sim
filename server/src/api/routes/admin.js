import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { authenticate } from '../middleware/auth.js';
import { query } from '../../db/database.js';
import { sendApprovalEmail, sendRejectionEmail, sendTestEmail, APP_URL } from '../../utils/email.js';

const router = Router();

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin permission required.' });
  next();
}

router.get('/users', authenticate, requireAdmin, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT id, user_code, first_name, last_name, tc_no, email, role, is_approved, is_banned, ban_reason, created_at
       FROM users ORDER BY created_at DESC`
    );
    res.json(rows);
  } catch { res.status(500).json({ error: 'Failed to fetch users.' }); }
});

router.post('/users/:id/approve', authenticate, requireAdmin, async (req, res) => {
  try {
    const { rows } = await query(
      `UPDATE users SET is_approved=true, role='user', updated_at=NOW()
       WHERE id=$1 RETURNING id, user_code, first_name, last_name, email`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'User not found.' });
    await sendApprovalEmail(rows[0]);
    res.json({ message: 'User approved.', user: rows[0] });
  } catch { res.status(500).json({ error: 'Approval failed.' }); }
});

router.post('/users/:id/reject', authenticate, requireAdmin, async (req, res) => {
  try {
    const { rows } = await query(
      `DELETE FROM users WHERE id=$1 AND is_approved=false RETURNING first_name, last_name, email`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'User not found or already approved.' });
    await sendRejectionEmail(rows[0]);
    res.json({ message: 'Request rejected.' });
  } catch { res.status(500).json({ error: 'Rejection failed.' }); }
});

router.post('/users/:id/ban', authenticate, requireAdmin, async (req, res) => {
  try {
    const { reason } = req.body;
    const { rows } = await query(
      `UPDATE users SET is_banned=true, ban_reason=$2, updated_at=NOW() WHERE id=$1 RETURNING user_code, first_name, last_name`,
      [req.params.id, reason ?? null]
    );
    if (!rows[0]) return res.status(404).json({ error: 'User not found.' });
    res.json({ message: 'User banned.' });
  } catch { res.status(500).json({ error: 'Ban failed.' }); }
});

router.post('/users/:id/unban', authenticate, requireAdmin, async (req, res) => {
  try {
    const { rows } = await query(
      `UPDATE users SET is_banned=false, ban_reason=NULL, updated_at=NOW() WHERE id=$1 RETURNING user_code`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'User not found.' });
    res.json({ message: 'Ban lifted.' });
  } catch { res.status(500).json({ error: 'Unban failed.' }); }
});

router.delete('/users/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    await query('DELETE FROM users WHERE id=$1', [req.params.id]);
    res.json({ message: 'User deleted.' });
  } catch { res.status(500).json({ error: 'Deletion failed.' }); }
});

const pageHtml = (user, token, msg) => {
  const safeMsg = msg ? { ...msg, text: escapeHtml(msg.text) } : null;
  const safeUser = user ? {
    ...user,
    first_name: escapeHtml(user.first_name),
    last_name: escapeHtml(user.last_name),
    tc_no: escapeHtml(user.tc_no ?? '---'),
    email: escapeHtml(user.email),
    user_code: escapeHtml(user.user_code),
    created_at: user.created_at,
  } : null;
  const safeToken = encodeURIComponent(token);
  const safeAppUrl = escapeHtml(APP_URL);
  user = safeUser;
  msg = safeMsg;
  token = safeToken;
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>ANATOLIA-SIM — Registration Review</title>
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
  <h1>⬡ ANATOLIA-SIM — Registration Request</h1>
  ${safeMsg ? `<div class="msg ${safeMsg.ok ? 'ok' : 'err'}">${safeMsg.text}</div>` : ''}
  ${safeUser ? `
  <div class="row"><span class="label">Full Name</span><span class="val">${user.first_name} ${user.last_name}</span></div>
  <div class="row"><span class="label">ID No</span><span class="val">${user.tc_no ?? '—'}</span></div>
  <div class="row"><span class="label">Email</span><span class="val">${user.email}</span></div>
  <div class="row"><span class="label">User Code</span><span class="val">${user.user_code}</span></div>
  <div class="row"><span class="label">Registration Date</span><span class="val">${new Date(user.created_at).toLocaleString('en-US')}</span></div>
  <hr class="divider">
  <div class="btns">
    <a class="btn approve" href="/api/admin/quick-approve/${token}">✔ APPROVE</a>
    <a class="btn reject" href="/api/admin/quick-reject/${token}">✘ REJECT</a>
  </div>` : ''}
  <a class="back" href="${safeAppUrl}/admin">← ADMIN PANEL</a>
</div></body></html>`;
};

// Review page — shows user info with approve/reject links
router.get('/review/:token', async (req, res) => {
  try {
    const payload = jwt.verify(req.params.token, process.env.JWT_SECRET);
    if (payload.action !== 'approve') return res.status(400).send(pageHtml(null, '', { ok: false, text: 'Invalid token type.' }));
    const { rows } = await query(
      `SELECT id, user_code, first_name, last_name, tc_no, email, is_approved, created_at FROM users WHERE id=$1`,
      [payload.userId]
    );
    if (!rows[0]) return res.send(pageHtml(null, '', { ok: false, text: 'User not found.' }));
    if (rows[0].is_approved) return res.send(pageHtml(null, '', { ok: true, text: `${rows[0].first_name} ${rows[0].last_name} is already approved.` }));
    res.send(pageHtml(rows[0], req.params.token, null));
  } catch (err) {
    const msg = err.name === 'TokenExpiredError'
      ? 'This approval link has expired (7 days). Please use the admin panel.'
      : 'Invalid link. Please approve from the admin panel.';
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
    if (!rows[0]) return res.send(pageHtml(null, '', { ok: true, text: 'This user is already approved.' }));
    try { await sendApprovalEmail(rows[0]); } catch (mailErr) { console.error('[APPROVE] Failed to send email:', mailErr.message); }
    res.send(pageHtml(null, '', { ok: true, text: `✔ ${rows[0].first_name} ${rows[0].last_name} approved — user code: ${rows[0].user_code}.` }));
  } catch (err) {
    const msg = err.name === 'TokenExpiredError' ? 'Link expired.' : 'Invalid link.';
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
    if (!rows[0]) return res.send(pageHtml(null, '', { ok: false, text: 'User not found or already approved.' }));
    try { await sendRejectionEmail(rows[0]); } catch (mailErr) { console.error('[REJECT] Failed to send email:', mailErr.message); }
    res.send(pageHtml(null, '', { ok: true, text: `✘ ${rows[0].first_name} ${rows[0].last_name} rejected.` }));
  } catch (err) {
    const msg = err.name === 'TokenExpiredError' ? 'Link expired.' : 'Invalid link.';
    res.status(400).send(pageHtml(null, '', { ok: false, text: msg }));
  }
});

// SMTP test — GET /api/admin/test-email
router.get('/test-email', authenticate, requireAdmin, async (req, res) => {
  const timer = setTimeout(() => {
    if (!res.headersSent) res.status(504).json({ error: 'SMTP connection timed out (15s). Port 587 may be blocked.' });
  }, 16000);
  try {
    await sendTestEmail();
    clearTimeout(timer);
    if (!res.headersSent) res.json({ message: `Test email sent to ${process.env.ADMIN_EMAIL ?? 'info@boldkimya.com.tr'}.` });
  } catch (err) {
    clearTimeout(timer);
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
});

// Seed first admin from env var — always requires ADMIN_SEED_TOKEN
router.post('/seed-admin', async (req, res) => {
  try {
    const seedToken = process.env.ADMIN_SEED_TOKEN;
    if (!seedToken || req.headers['x-seed-token'] !== seedToken) {
      return res.status(403).json({ error: 'Admin seed token required.' });
    }
    const adminCode = process.env.ADMIN_USER_CODE;
    const adminPass = process.env.ADMIN_PASSWORD;
    const adminEmail = process.env.ADMIN_EMAIL;
    if (!adminCode || !adminPass || !adminEmail) return res.status(400).json({ error: 'ADMIN_USER_CODE, ADMIN_PASSWORD and ADMIN_EMAIL env vars are required.' });
    const bcrypt = (await import('bcrypt')).default;
    const hash = await bcrypt.hash(adminPass, 12);

    // Check if admin already exists
    const existing = await query('SELECT id FROM users WHERE user_code=$1 OR email=$2', [adminCode, adminEmail]);
    if (existing.rows.length > 0) {
      await query(`UPDATE users SET role='admin', is_approved=true, is_banned=false, password_hash=$1, user_code=$2, username=$2 WHERE user_code=$2 OR email=$3`,
        [hash, adminCode, adminEmail]);
      return res.json({ message: 'Admin updated.' });
    }

    await query(
      `INSERT INTO users (user_code, username, first_name, last_name, email, password_hash, role, is_approved)
       VALUES ($1,$1,'Admin','Administrator',$2,$3,'admin',true)`,
      [adminCode, adminEmail, hash]
    );
    res.json({ message: 'Admin created.' });
  } catch (err) {
    console.error('seed-admin error:', err.message, err.code);
    res.status(500).json({ error: 'Failed to create admin.', detail: err.message });
  }
});

// Cleanup form page — accessible from mobile without login
router.get('/cleanup-page', (req, res) => {
  const done = req.query.done;
  const err  = req.query.err;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>DB Temizle — Anatolia-Sim</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#030310;color:#c8d4f0;font-family:'Courier New',monospace;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
.card{background:#0a0a1e;border:1px solid rgba(79,110,247,0.35);padding:32px 28px;max-width:400px;width:100%}
h1{font-size:11px;letter-spacing:.3em;color:#4f6ef7;margin-bottom:6px;text-transform:uppercase}
p{font-size:12px;color:#6070a0;margin-bottom:24px;line-height:1.6}
label{display:block;font-size:10px;letter-spacing:.2em;color:#8a9ab0;margin-bottom:6px}
input{width:100%;background:#030310;border:1px solid rgba(79,110,247,0.3);color:#e0e8ff;padding:10px 12px;font-family:inherit;font-size:13px;margin-bottom:16px;outline:none}
input:focus{border-color:rgba(79,110,247,0.7)}
button{width:100%;padding:12px;background:rgba(224,90,90,0.15);border:1px solid rgba(224,90,90,0.5);color:#e05a5a;font-family:inherit;font-size:11px;letter-spacing:.2em;cursor:pointer}
button:hover{background:rgba(224,90,90,0.25)}
.ok{padding:12px;background:rgba(78,203,113,0.08);border:1px solid rgba(78,203,113,0.3);color:#4ecb71;font-size:12px;margin-bottom:16px;line-height:1.7}
.er{padding:12px;background:rgba(224,90,90,0.08);border:1px solid rgba(224,90,90,0.3);color:#e05a5a;font-size:12px;margin-bottom:16px}
</style>
</head>
<body>
<div class="card">
  <h1>⬡ Anatolia-Sim — Veritabanı Temizle</h1>
  <p>Checkpoint'ler, eski event'ler ve ölü bireyler silinir.<br>Bu işlem geri alınamaz.</p>
  ${done ? `<div class="ok">✓ Temizleme tamamlandı!<br>${decodeURIComponent(done)}</div>` : ''}
  ${err  ? `<div class="er">✗ Hata: ${decodeURIComponent(err)}</div>` : ''}
  <form method="POST" action="/api/admin/cleanup-page">
    <label>ADMIN_SEED_TOKEN</label>
    <input type="password" name="token" placeholder="Render'dan kopyalayın" required autofocus />
    <button type="submit">TEMİZLE</button>
  </form>
</div>
</body>
</html>`);
});

// Cleanup form POST handler — form submission from cleanup-page
router.post('/cleanup-page', async (req, res) => {
  const seedToken = process.env.ADMIN_SEED_TOKEN;
  const { token } = req.body ?? {};
  if (!seedToken || token !== seedToken) {
    return res.redirect('/api/admin/cleanup-page?err=' + encodeURIComponent('Geçersiz token.'));
  }
  try {
    const evRes  = await query(`DELETE FROM simulation_events WHERE id IN (SELECT id FROM (SELECT id, ROW_NUMBER() OVER (PARTITION BY simulation_id ORDER BY sim_day DESC) AS rn FROM simulation_events) t WHERE rn > 500)`);
    const cpRes  = await query('DELETE FROM checkpoints');
    const indRes = await query(`DELETE FROM individuals WHERE alive = false AND id IN (SELECT i.id FROM individuals i JOIN simulations s ON s.id = i.simulation_id WHERE i.alive = false AND i.death_day < (s.current_day - 1000))`);
    await query('VACUUM');
    const msg = `Checkpoint: ${cpRes.rowCount} · Event: ${evRes.rowCount} · Ölü birey: ${indRes.rowCount}`;
    res.redirect('/api/admin/cleanup-page?done=' + encodeURIComponent(msg));
  } catch (err) {
    res.redirect('/api/admin/cleanup-page?err=' + encodeURIComponent(err.message));
  }
});

// Emergency disk cleanup — deletes old events/checkpoints/dead individuals to free space
// curl -X POST /api/admin/cleanup -H "x-seed-token: $ADMIN_SEED_TOKEN"
router.post('/cleanup', async (req, res) => {
  const seedToken = process.env.ADMIN_SEED_TOKEN;
  if (!seedToken || req.headers['x-seed-token'] !== seedToken) {
    return res.status(403).json({ error: 'Invalid token.' });
  }
  try {
    const results = {};

    // Keep only last 500 events per simulation
    const evRes = await query(`
      DELETE FROM simulation_events
      WHERE id IN (
        SELECT id FROM (
          SELECT id, ROW_NUMBER() OVER (PARTITION BY simulation_id ORDER BY sim_day DESC) AS rn
          FROM simulation_events
        ) t WHERE rn > 500
      )
    `);
    results.events_deleted = evRes.rowCount;

    // Delete all checkpoints (they're big JSON blobs)
    const cpRes = await query('DELETE FROM checkpoints');
    results.checkpoints_deleted = cpRes.rowCount;

    // Delete dead individuals older than 1000 days from the newest living individual per sim
    const indRes = await query(`
      DELETE FROM individuals
      WHERE alive = false
      AND id IN (
        SELECT i.id FROM individuals i
        JOIN simulations s ON s.id = i.simulation_id
        WHERE i.alive = false AND i.death_day < (s.current_day - 1000)
      )
    `);
    results.dead_individuals_deleted = indRes.rowCount;

    // VACUUM to actually reclaim disk space
    await query('VACUUM');

    res.json({ success: true, ...results });
  } catch (err) {
    console.error('cleanup error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
