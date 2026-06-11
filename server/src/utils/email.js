import nodemailer from 'nodemailer';

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'info@boldkimya.com.tr';
export const APP_URL = process.env.APP_URL
  ?? process.env.RENDER_EXTERNAL_URL
  ?? (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : null)
  ?? 'https://anatolia-sim.onrender.com';
const FROM_NAME = 'ANATOLİA-SİM';

async function sendViaResend(to, subject, text, html) {
  const { Resend } = await import('resend');
  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.RESEND_FROM ?? `${FROM_NAME} <onboarding@resend.dev>`;
  const payload = { from, to, subject, text };
  if (html) payload.html = html;
  const { error } = await resend.emails.send(payload);
  if (error) throw new Error('Resend error: ' + error.message);
  console.log('[EMAIL] Resend sent:', subject, '->', to);
}

async function sendViaSMTP(to, subject, text, html) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) throw new Error('SMTP yapilandirilmamis.');
  const port = parseInt(SMTP_PORT ?? '587');
  const transport = nodemailer.createTransport({
    host: SMTP_HOST, port, secure: port === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    tls: { rejectUnauthorized: false },
    connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
  });
  const from = `"${FROM_NAME}" <${SMTP_USER}>`;
  const opts = { from, to, subject, text };
  if (html) opts.html = html;
  const info = await transport.sendMail(opts);
  console.log('[EMAIL] SMTP sent:', subject, '->', to, '| id:', info.messageId);
}

async function deliver(to, subject, text, html) {
  if (process.env.RESEND_API_KEY) return sendViaResend(to, subject, text, html);
  if (process.env.SMTP_HOST) return sendViaSMTP(to, subject, text, html);
  console.log('[EMAIL - NO TRANSPORT]', subject, '\n', text);
}

export async function sendAdminRegistrationNotification({ first_name, last_name, tc_no, email, user_code_temp, approvalToken }) {
  const reviewLink = `${APP_URL}/api/admin/review/${approvalToken}`;
  const safe = {
    first_name: escapeHtml(first_name),
    last_name: escapeHtml(last_name),
    tc_no: escapeHtml(tc_no),
    email: escapeHtml(email),
    user_code_temp: escapeHtml(user_code_temp),
    reviewLink: escapeHtml(reviewLink),
  };
  const text = `Yeni kayit talebi - ANATOLiA-SiM\n\nAd Soyad: ${first_name} ${last_name}\nTC No: ${tc_no}\nE-posta: ${email}\nKullanici Kodu: ${user_code_temp}\n\nIncele: ${reviewLink}`;
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="background:#0a0a1e;color:#c8d4f0;font-family:'Courier New',monospace;padding:32px;max-width:480px;margin:0 auto">
<h2 style="color:#4f6ef7;font-size:12px;letter-spacing:.3em;margin-bottom:20px">ANATOLiA-SiM &mdash; YENi KAYIT TALEBi</h2>
<table style="width:100%;border-collapse:collapse;margin-bottom:24px;font-size:14px">
  <tr><td style="color:#6070a0;padding:6px 0;width:140px">Ad Soyad</td><td style="color:#e0e8ff;font-weight:bold">${safe.first_name} ${safe.last_name}</td></tr>
  <tr><td style="color:#6070a0;padding:6px 0">TC No</td><td style="color:#e0e8ff">${safe.tc_no}</td></tr>
  <tr><td style="color:#6070a0;padding:6px 0">E-posta</td><td style="color:#e0e8ff">${safe.email}</td></tr>
  <tr><td style="color:#6070a0;padding:6px 0">Kullanici Kodu</td><td style="color:#e0e8ff;font-weight:bold">${safe.user_code_temp}</td></tr>
</table>
<a href="${safe.reviewLink}" style="display:inline-block;padding:14px 32px;background:rgba(79,110,247,0.25);border:1px solid rgba(79,110,247,0.6);color:#a0b4ff;text-decoration:none;font-size:13px;letter-spacing:.15em">&#10003; / &#10007; &nbsp; iNCELE &amp; KARAR VER</a>
<p style="margin-top:24px;font-size:11px;color:#404060">Link 7 gun gecerlidir &middot; Bold Askeri Teknoloji ve Savunma Sanayii A.S. &middot; RST Q-Nation 200120401018</p>
</body></html>`;
  await deliver(ADMIN_EMAIL, `[KAYIT TALEBi] ${first_name} ${last_name}`, text, html);
}

export async function sendApprovalEmail({ first_name, last_name, email, user_code }) {
  const text = `Sayin ${first_name} ${last_name},\n\nANATOLiA-SiM sistemine kaydiniz onaylanmistir.\n\nKullanici Kodunuz: ${user_code}\nSisteme giris: ${APP_URL}/login\n\nBold Askeri Teknoloji ve Savunma Sanayii A.S.`;
  await deliver(email, 'ANATOLiA-SiM - Kaydiniz Onaylandi', text);
}

export async function sendRejectionEmail({ first_name, last_name, email }) {
  const text = `Sayin ${first_name} ${last_name},\n\nKaydiniz yonetim tarafindan reddedilmistir.\nSorulariniz icin ${ADMIN_EMAIL} adresine yazabilirsiniz.\n\nBold Askeri Teknoloji ve Savunma Sanayii A.S.`;
  await deliver(email, 'ANATOLiA-SiM - Kayit Talebi Reddedildi', text);
}

export async function sendTestEmail() {
  await deliver(ADMIN_EMAIL, 'ANATOLiA-SiM - Test', `E-posta sistemi calisiyor.\nTarih: ${new Date().toISOString()}`);
}
