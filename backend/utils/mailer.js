import nodemailer from 'nodemailer';

let transporter;

export const getTransporter = () => {
  if (transporter) return transporter;
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = String(process.env.SMTP_SECURE || 'false') === 'true';
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    // Fallback: JSON transport for dev logging
    transporter = nodemailer.createTransport({ jsonTransport: true });
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
  return transporter;
};

export const sendEmail = async ({ to, subject, html, text }) => {
  const from = process.env.SMTP_FROM || 'Resolvet <no-reply@resolveit.com>';
  const t = getTransporter();
  const info = await t.sendMail({ from, to, subject, html, text });
  return info;
};

export const inviteEmailTemplate = ({ role, acceptUrl, expiry }) => {
  const prettyExpiry = expiry ? new Date(expiry).toLocaleString() : '';
  return `
  <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica, Arial, sans-serif; line-height:1.6;">
    <h2>You're invited to Resolvet</h2>
    <p>You have been invited to join Resolvet as <strong>${role}</strong>.</p>
    <p>This invitation expires on <strong>${prettyExpiry}</strong>.</p>
    <p>
      <a href="${acceptUrl}" style="display:inline-block;padding:10px 16px;background:#111;color:#fff;border-radius:6px;text-decoration:none;">Accept your invitation</a>
    </p>
    <p>If the button doesn't work, copy and paste this link into your browser:</p>
    <p><a href="${acceptUrl}">${acceptUrl}</a></p>
  </div>
  `;
};


