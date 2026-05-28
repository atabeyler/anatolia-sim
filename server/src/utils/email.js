import nodemailer from 'nodemailer';

function getTransport() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT ?? '587'),
    secure: parseInt(SMTP_PORT ?? '587') === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'info@boldkimya.com.tr';
const FROM = process.env.SMTP_FROM ?? `"ANATOLİA-SİM" <${process.env.SMTP_USER ?? 'no-reply@anatolia-sim.app'}>`;

export async function sendAdminRegistrationNotification({ first_name, last_name, tc_no, email, user_code_temp }) {
  const transport = getTransport();
  const body = `
Yeni kayıt talebi — ANATOLİA-SİM MEDENİYET

Ad Soyad : ${first_name} ${last_name}
TC No     : ${tc_no}
E-posta   : ${email}
Geçici Kod: ${user_code_temp}

Onaylamak için yönetim paneline giriş yapın:
${process.env.CLIENT_URL ?? 'https://anatolia-sim-client.onrender.com'}/admin
`;
  if (!transport) {
    console.log('[EMAIL - ADMIN NOTIFY]', body);
    return;
  }
  await transport.sendMail({ from: FROM, to: ADMIN_EMAIL, subject: `[KAYIT TALEBİ] ${first_name} ${last_name}`, text: body });
}

export async function sendApprovalEmail({ first_name, last_name, email, user_code }) {
  const transport = getTransport();
  const body = `
Sayın ${first_name} ${last_name},

ANATOLİA-SİM MEDENİYET sistemine kaydınız onaylanmıştır.

Kullanıcı Kodunuz : ${user_code}
Sisteme giriş     : ${process.env.CLIENT_URL ?? 'https://anatolia-sim-client.onrender.com'}/login

Kullanıcı kodunuz ve kayıt sırasında belirlediğiniz şifrenizle giriş yapabilirsiniz.

Bold Askeri Teknoloji ve Savunma Sanayi A.Ş.
RST Q-Nation 200120401018
`;
  if (!transport) {
    console.log('[EMAIL - APPROVAL]', body);
    return;
  }
  await transport.sendMail({ from: FROM, to: email, subject: 'ANATOLİA-SİM — Kaydınız Onaylandı', text: body });
}

export async function sendRejectionEmail({ first_name, last_name, email }) {
  const transport = getTransport();
  const body = `
Sayın ${first_name} ${last_name},

Kaydınız yönetim tarafından reddedilmiştir.
Sorularınız için ${ADMIN_EMAIL} adresine yazabilirsiniz.

Bold Askeri Teknoloji ve Savunma Sanayi A.Ş.
`;
  if (!transport) {
    console.log('[EMAIL - REJECTION]', body);
    return;
  }
  await transport.sendMail({ from: FROM, to: email, subject: 'ANATOLİA-SİM — Kayıt Talebi Reddedildi', text: body });
}
