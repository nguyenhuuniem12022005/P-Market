import nodemailer from 'nodemailer';

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  if (!process.env.MAIL_HOST || !process.env.MAIL_USER || !process.env.MAIL_PASSWORD) {
    throw new Error('MAIL_HOST/MAIL_USER/MAIL_PASSWORD chưa được cấu hình');
  }

  transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT || 587),
    secure: process.env.MAIL_SECURE === 'true',
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASSWORD,
    },
  });
  return transporter;
}

export async function sendMail({ to, subject, html, text }) {
  const mailer = getTransporter();
  const from = process.env.MAIL_FROM || 'P-Market <no-reply@pmarket.local>';
  await mailer.sendMail({
    from,
    to,
    subject,
    html,
    text,
  });
}
