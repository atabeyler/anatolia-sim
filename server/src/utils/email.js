import nodemailer from 'nodemailer';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'info@boldkimya.com.tr';
export const APP_URL = process.env.RENDER_EXTERNAL_URL ?? process.env.APP_URL ?? 'https://anatolia-sim.onrender.com';
const FROM_NAME = 'ANATOLİA-SİM';
const FROM_ADDR = process.env.SMTP_USER ?? 'onboarding@resend.dev';

async function sendViaResend(to, subject, text) {
  const { Resend } = await import('resend');
  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.RESEND_FROM ?? `${FROM_NAME} <onboarding@resend.dev>`;
  const { error } = await resend.emails.send({ from, to, subject, text });
  if (error) throw new Error('Resend error: ' + error.message);
  console.log('[EMAIL] Resend sent:', subject, '→', to);
}

async function sendViaSMTP(to, subject, text) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) throw new Error('SMTP yapılandırılmamış.');
  const port = parseInt(SMTP_PORT ?? '587');
  const transport = nodemailer.createTransport({
    host: SMTP_HOST, port, secure: port === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    tls: { rejectUnauthorized: false },
    connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
  });
  const from = `"${FROM_NAME}" <${SMTP_USER}>`;
  const info = await transport.sendMail({ from, to, subject, text });
  console.log('[EMAIL] SMTP sent:', subject, '→', to, '| id:', info.messageId);
}

async function deliver(to, subject, text) {
  if (process.env.RESEND_API_KEY) {
    return sendViaResend(to, subject, text);
  }
  if (process.env.SMTP_HOST) {
    return sendViaSMTP(to, subject, text);
  }
  console.log('[EMAIL - NO TRANSPORT]', subject, '\n', text);
}

export async function sendAdminRegistrationNotification({ first_name, last_name, tc_no, email, user_code_temp, approvalToken }) {
  const approvalLink = `${APP_URL}/api/admin/quick-approve/${approvalToken}`;
  const text = `Yeni kayıt talebi — ANATOLİA-SİM MEDENİYET

Ad Soyad      : ${first_name} ${last_name}
TC No         : ${tc_no}
E-posta       : ${email}
Kullanıcı Kodu: ${user_code_temp}

▶ TEK TIKLA ONAYLA:
${approvalLink}

(Link 7 gün geçerlidir. Yönetim paneli: ${APP_URL}/admin)

Bold Askeri Teknoloji ve Savunma Sanayi A.Ş.
RST Q-Nation 200120401018`;
  await deliver(ADMIN_EMAIL, `[KAYIT TALEBİ] ${first_name} ${last_name}`, text);
}

export async function sendApprovalEmail({ first_name, last_name, email, user_code }) {
  const text = `Sayın ${first_name} ${last_name},

ANATOLİA-SİM MEDENİYET sistemine kaydınız onaylanmıştır.

Kullanıcı Kodunuz : ${user_code}
Sisteme giriş     : ${APP_URL}/login

Kullanıcı kodunuz ve kayıt sırasında belirlediğiniz şifrenizle giriş yapabilirsiniz.

Bold Askeri Teknoloji ve Savunma Sanayi A.Ş.
RST Q-Nation 200120401018`;
  await deliver(email, 'ANATOLİA-SİM — Kaydınız Onaylandı', text);
}

export async function sendRejectionEmail({ first_name, last_name, email }) {
  const text = `Sayın ${first_name} ${last_name},

Kaydınız yönetim tarafından reddedilmiştir.
Sorularınız için ${ADMIN_EMAIL} adresine yazabilirsiniz.

Bold Askeri Teknoloji ve Savunma Sanayi A.Ş.`;
  await deliver(email, 'ANATOLİA-SİM — Kayıt Talebi Reddedildi', text);
}

export async function sendTestEmail() {
  await deliver(ADMIN_EMAIL, 'ANATOLİA-SİM — SMTP/Resend Test', `E-posta sistemi çalışıyor.\nTarih: ${new Date().toISOString()}`);
}
