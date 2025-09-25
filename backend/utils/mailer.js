import nodemailer from 'nodemailer';

let transporter;

export const getTransporter = () => {
  if (transporter) return transporter;
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = String(process.env.SMTP_SECURE || 'false') === 'true';
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const pool = String(process.env.SMTP_POOL || 'true') === 'true';
  const maxConnections = Number(process.env.SMTP_MAX_CONNECTIONS || 5);
  const maxMessages = Number(process.env.SMTP_MAX_MESSAGES || 100);
  const connectionTimeout = Number(process.env.SMTP_CONNECTION_TIMEOUT_MS || 10000);
  const greetingTimeout = Number(process.env.SMTP_GREETING_TIMEOUT_MS || 10000);
  const socketTimeout = Number(process.env.SMTP_SOCKET_TIMEOUT_MS || 10000);
  const requireTLS = String(process.env.SMTP_REQUIRE_TLS || 'false') === 'true';
  const ignoreTLS = String(process.env.SMTP_IGNORE_TLS || 'false') === 'true';
  const tlsRejectUnauthorized = String(process.env.SMTP_TLS_REJECT_UNAUTHORIZED || 'true') === 'true';
  const enableLogger = String(process.env.SMTP_LOGGER || 'false') === 'true';

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
    pool,
    maxConnections,
    maxMessages,
    connectionTimeout,
    greetingTimeout,
    socketTimeout,
    requireTLS,
    ignoreTLS,
    tls: { rejectUnauthorized: tlsRejectUnauthorized },
    logger: enableLogger,
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


