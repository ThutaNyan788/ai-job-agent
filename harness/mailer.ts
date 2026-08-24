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

// Email clients (Gmail, Outlook) strip <style> blocks, so every rule here is
// inline. Table-based layout instead of flex/grid because Outlook renders
// with Word's engine, which ignores most modern CSS.
export function buildEmailHtml(options: { preheader: string; bodyHtml: string; ctaText: string; ctaUrl: string }): string {
  const { preheader, bodyHtml, ctaText, ctaUrl } = options;
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <span style="display:none;font-size:1px;color:#f4f4f5;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(preheader)}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#ffffff;border-radius:8px;overflow:hidden;">
            <tr>
              <td style="background-color:#171717;padding:20px 32px;">
                <span style="color:#ffffff;font-size:16px;font-weight:600;letter-spacing:0.02em;">PhayShin</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;color:#171717;font-size:15px;line-height:1.6;">
                ${bodyHtml}
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:24px;">
                  <tr>
                    <td style="border-radius:6px;background-color:#171717;">
                      <a href="${escapeHtml(ctaUrl)}" style="display:inline-block;padding:12px 24px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:6px;">${escapeHtml(ctaText)}</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px;border-top:1px solid #e4e4e7;color:#a1a1aa;font-size:12px;">
                Sent by PhayShin
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
