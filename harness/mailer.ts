import nodemailer from "nodemailer";

export type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  from: string;
};

// Returns null when the environment is incomplete, so callers can report a
// configuration problem without a network round trip.
export function getSmtpConfig(): SmtpConfig | null {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 2525);
  const user = process.env.SMTP_USER;
  const password = process.env.SMTP_PASSWORD;
  const from = process.env.EMAIL_FROM ?? user;
  if (!host || !user || !password || !from || !Number.isInteger(port)) return null;
  return { host, port, secure: process.env.SMTP_SECURE === "true", user, password, from };
}

// One transporter for the process instead of one per send. The explicit
// timeouts matter: nodemailer's defaults let a blocked SMTP port hang for
// minutes, which makes a firewall look like a frozen server.
let transporter: nodemailer.Transporter | null = null;
function getTransporter(config: SmtpConfig): nodemailer.Transporter {
  transporter ??= nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.password },
    connectionTimeout: 30_000,
    greetingTimeout: 20_000,
    socketTimeout: 30_000,
  });
  return transporter;
}

export async function sendMail(options: { to: string; subject: string; text: string; html: string }): Promise<void> {
  const config = getSmtpConfig();
  if (!config) {
    throw new Error("Email is not configured. Check SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, and EMAIL_FROM.");
  }
  await getTransporter(config).sendMail({ from: config.from, ...options });
}

// SMTP failures are mostly network-shaped. Turn the raw codes into something a
// person reading the UI can act on.
export function describeMailError(error: unknown): string {
  const failure = error as NodeJS.ErrnoException;
  if (failure.code === "EAUTH") {
    return "The mail server rejected the SMTP username or password.";
  }
  if (failure.code === "ETIMEDOUT" || failure.code === "ECONNECTION" || failure.code === "ESOCKET") {
    return `Could not reach ${process.env.SMTP_HOST} on port ${process.env.SMTP_PORT}. That port is likely blocked by your network - Mailtrap also accepts port 2525.`;
  }
  return failure.message || "Unknown mail error.";
}

export function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character,
  );
}
