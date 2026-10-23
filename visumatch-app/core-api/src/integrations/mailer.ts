import nodemailer, { Transporter } from 'nodemailer';
import { config } from '../config/env.js';

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (!config.smtpHost || !config.smtpUser) {
    return null;
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpSecure,
      auth: {
        user: config.smtpUser,
        pass: config.smtpPass,
      },
    });
  }

  return transporter;
}

export async function sendVerificationEmail(toEmail: string, code: string): Promise<void> {
  const mailer = getTransporter();

  if (!mailer) {
    if (config.nodeEnv === 'development') {
      console.log(`\n========================================`);
      console.log(`[MAILER DEV MODE] OTP Code for ${toEmail}: ${code}`);
      console.log(`========================================\n`);
    }
    return;
  }

  const html = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <title>Verifikasi Email VisuMatch</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f7; color: #333333; margin: 0; padding: 20px; }
        .container { max-width: 520px; margin: 0 auto; background-color: #ffffff; padding: 32px; border-radius: 8px; border: 1px solid #e2e8f0; }
        .header { text-align: center; margin-bottom: 24px; }
        .title { font-size: 22px; font-weight: bold; color: #1e293b; }
        .code-box { background-color: #f1f5f9; border-radius: 6px; padding: 18px; text-align: center; margin: 24px 0; font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #2563eb; }
        .footer { font-size: 13px; color: #64748b; line-height: 1.5; margin-top: 24px; text-align: center; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="title">Verifikasi Akun VisuMatch</div>
        </div>
        <p>Halo,</p>
        <p>Gunakan kode verifikasi berikut untuk mengonfirmasi email dan mengaktifkan akun Anda:</p>
        <div class="code-box">${code}</div>
        <p class="footer">
          Kode ini <strong>berlaku 10 menit</strong>.<br>
          Abaikan jika bukan Anda yang meminta pendaftaran ini.
        </p>
      </div>
    </body>
    </html>
  `;

  await mailer.sendMail({
    from: config.mailFrom,
    to: toEmail,
    subject: 'Kode Verifikasi Email VisuMatch',
    html,
  });
}
