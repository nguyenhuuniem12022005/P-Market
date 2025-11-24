const RESEND_API_KEY = process.env.RESEND_API_KEY;

/**
 * Gửi email qua Resend HTTP API.
 * Yêu cầu env:
 *  - RESEND_API_KEY
 *  - MAIL_FROM (địa chỉ đã được phép gửi, ví dụ onresend.com hoặc domain đã verify)
 */
export async function sendMail({ to, subject, html, text }) {
  if (!RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY chưa được cấu hình');
  }
  if (!to) {
    throw new Error('Thiếu địa chỉ người nhận');
  }

  const from = process.env.MAIL_FROM || 'P-Market <no-reply@pmarket.onresend.com>';

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to,
      subject: subject || '',
      html: html || '',
      text: text || '',
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.error?.message || data?.message || 'Gửi email thất bại';
    throw new Error(message);
  }
  return data;
}
