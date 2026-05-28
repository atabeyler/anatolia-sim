import nodemailer from 'nodemailer';

function getTransport() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.warn('[EMAIL] SMTP not configured — SMTP_HOST, SMTP_USER or SMTP_PASS missing.');
    return null;
  }
  const port = parseInt(SMTP_PORT ?? '587');
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    tls: { rejectUnauthorized: false },
  });
}

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'info@boldkimya.com.tr';
const FROM = process.env.SMTP_FROM ?? `"ANATOLİA-SİM" <${process.env.SMTP_USER ?? 'no-reply@anatolia-sim.app'}>`;
export const APP_URL = process.env.RENDER_EXTERNAL_URL ?? process.env.APP_URL ?? 'https://anatolia-sim.onrender.com';

async function send(transport, opts) {
  try {
    const info = await transport.sendMail(opts);
    console.log('[EMAIL] Sent:', opts.subject, '→', opts.to, '| msgId:', info.messageId);
  } catch (err) {
    console.error('[EMAIL] Send failed:', err.message, '| to:', opts.to, '| subject:', opts.subject);
    throw err;
  }
}

export async function sendAdminRegistrationNotification({ first_name, last_name, tc_no, email, user_code_temp, approvalToken }) {
  const transport = getTransport();
  const approvalLink = `${APP_URL}/api/admin/quick-approve/${approvalToken}`;
  const body = `Yeni kayıt talebi — ANATOLİA-SİM MEDENİYET

Ad Soyad      : ${first_name} ${last_name}
TC No         : ${tc_no}
E-posta       : ${email}
Kullanıcı Kodu: ${user_code_temp}

▶ TEK TIKLA ONAYLA:
${approvalLink}

(Link 7 gün geçerlidir. Yönetim panelinden de onaylayabilirsiniz: ${APP_URL}/admin)

Bold Askeri Teknoloji ve Savunma Sanayi A.Ş.
RST Q-Nation 200120401018`;

  if (!transport) { console.log('[EMAIL - ADMIN NOTIFY]', body); return; }
  await send(transport, { from: FROM, to: ADMIN_EMAIL, subject: `[KAYIT TALEBİ] ${first_name} ${last_name}`, text: body });
}

export async function sendApprovalEmail({ first_name, last_name, email, user_code }) {
  const transport = getTransport();
  const body = `Sayın ${first_name} ${last_name},

ANATOLİA-SİM MEDENİYET sistemine kaydınız onaylanmıştır.

Kullanıcı Kodunuz : ${user_code}
Sisteme giriş     : ${APP_URL}/login

Kullanıcı kodunuz ve kayıt sırasında belirlediğiniz şifrenizle giriş yapabilirsiniz.

Bold Askeri Teknoloji ve Savunma Sanayi A.Ş.
RST Q-Nation 200120401018`;

  if (!transport) { console.log('[EMAIL - APPROVAL]', body); return; }
  await send(transport, { from: FROM, to: email, subject: 'ANATOLİA-SİM — Kaydınız Onaylandı', text: body });
}

export async function sendRejectionEmail({ first_name, last_name, email }) {
  const transport = getTransport();
  const body = `Sayın ${first_name} ${last_name},

Kaydınız yönetim tarafından reddedilmiştir.
Sorularınız için ${ADMIN_EMAIL} adresine yazabilirsiniz.

Bold Askeri Teknoloji ve Savunma Sanayi A.Ş.`;

  if (!transport) { console.log('[EMAIL - REJECTION]', body); return; }
  await send(transport, { from: FROM, to: email, subject: 'ANATOLİA-SİM — Kayıt Talebi Reddedildi', text: body });
}

export async function sendTestEmail() {
  const transport = getTransport();
  if (!transport) throw new Error('SMTP yapılandırılmamış. SMTP_HOST, SMTP_USER, SMTP_PASS env var eksik.');
  await send(transport, {
    from: FROM,
    to: ADMIN_EMAIL,
    subject: 'ANATOLİA-SİM — SMTP Test',
    text: `SMTP bağlantısı başarılı.\nSunucu: ${process.env.SMTP_HOST}:${process.env.SMTP_PORT ?? 587}\nTarih: ${new Date().toISOString()}`,
  });
}
