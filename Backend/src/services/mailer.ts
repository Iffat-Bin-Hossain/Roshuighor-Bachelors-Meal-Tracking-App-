import nodemailer, { Transporter } from 'nodemailer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { env } from '../config/env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Works from both src/ (tsx) and dist/ (compiled): assets/ sits next to them in Backend/
const LOGO_PATH = path.resolve(__dirname, '../../assets/email-logo.png');
export const LOGO_CID = 'rosuighor-logo@rosuighor';

let transporter: Transporter | null = null;

export const isMailConfigured = (): boolean => Boolean(env.smtp.host && env.smtp.user && env.smtp.pass);

const getTransporter = (): Transporter => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.secure,
      auth: { user: env.smtp.user, pass: env.smtp.pass }
    });
  }
  return transporter;
};

export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export const sendMail = async (msg: MailMessage): Promise<void> => {
  if (!isMailConfigured()) {
    if (env.isProduction) {
      throw new Error('SMTP is not configured (set SMTP_HOST, SMTP_USER, SMTP_PASS)');
    }
    // Development fallback: print the email so the flow can be tested without SMTP credentials
    console.log('\n📧 [DEV MAIL — SMTP not configured, not actually sent]');
    console.log(`To: ${msg.to}\nSubject: ${msg.subject}\n\n${msg.text}\n`);
    return;
  }

  const attachments = fs.existsSync(LOGO_PATH)
    ? [{ filename: 'rosuighor-logo.png', path: LOGO_PATH, cid: LOGO_CID }]
    : [];

  await getTransporter().sendMail({
    from: env.mailFrom,
    to: msg.to,
    subject: msg.subject,
    html: msg.html,
    text: msg.text,
    attachments
  });
};

export const verifyMailTransport = async (): Promise<void> => {
  if (!isMailConfigured()) {
    console.warn('⚠️  SMTP not configured — emails will be printed to the console' + (env.isProduction ? ' (and FAIL in production)' : ''));
    return;
  }
  try {
    await getTransporter().verify();
    console.log(`📧 SMTP ready (${env.smtp.host}:${env.smtp.port})`);
  } catch (err: any) {
    console.error('❌ SMTP connection failed:', err.message);
  }
};
