import dotenv from 'dotenv';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

if (isProduction && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be set in production');
}

// Single source of truth for the JWT secret (sign + verify must always match)
export const JWT_SECRET = process.env.JWT_SECRET || 'rosuighor_dev_only_secret_change_me';

export const env = {
  isProduction,
  port: Number(process.env.PORT) || 5000,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT) || 465,
    secure: (process.env.SMTP_SECURE ?? 'true') !== 'false',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || ''
  },
  mailFrom: process.env.MAIL_FROM || 'রসুইঘর (Rosuighor) <no-reply@rosuighor.app>'
};
