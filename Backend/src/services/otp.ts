import crypto from 'crypto';
import { query } from '../config/db.js';
import { JWT_SECRET } from '../config/env.js';

export type OtpPurpose = 'verify' | 'reset';

export const OTP_TTL_MINUTES = 10;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_COOLDOWN_SECONDS = 60;

const hashCode = (userId: number, purpose: OtpPurpose, code: string): string =>
  crypto.createHmac('sha256', JWT_SECRET).update(`${userId}:${purpose}:${code}`).digest('hex');

export class OtpCooldownError extends Error {
  constructor(public retryAfter: number) {
    super('Please wait before requesting another code');
  }
}

/** Seconds the user must still wait before a new code can be issued (0 = can send now). */
export const cooldownRemaining = async (userId: number, purpose: OtpPurpose): Promise<number> => {
  const res = await query(
    `SELECT EXTRACT(EPOCH FROM (NOW() - created_at))::int AS age
     FROM email_otps WHERE user_id = $1 AND purpose = $2
     ORDER BY created_at DESC LIMIT 1`,
    [userId, purpose]
  );
  if (res.rows.length === 0) return 0;
  return Math.max(0, OTP_RESEND_COOLDOWN_SECONDS - res.rows[0].age);
};

/** Issues a fresh 6-digit code, invalidating any previous unused code for the same purpose. */
export const issueOtp = async (userId: number, purpose: OtpPurpose): Promise<string> => {
  const wait = await cooldownRemaining(userId, purpose);
  if (wait > 0) throw new OtpCooldownError(wait);

  const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');

  await query(
    `UPDATE email_otps SET consumed_at = NOW()
     WHERE user_id = $1 AND purpose = $2 AND consumed_at IS NULL`,
    [userId, purpose]
  );
  await query(
    `INSERT INTO email_otps (user_id, purpose, code_hash, expires_at)
     VALUES ($1, $2, $3, NOW() + ($4 || ' minutes')::interval)`,
    [userId, purpose, hashCode(userId, purpose, code), String(OTP_TTL_MINUTES)]
  );
  return code;
};

export type OtpCheckResult = 'ok' | 'invalid' | 'expired' | 'too_many_attempts';

/** Checks a code and consumes it on success. Wrong guesses count towards the attempt limit. */
export const consumeOtp = async (userId: number, purpose: OtpPurpose, code: string): Promise<OtpCheckResult> => {
  const res = await query(
    `SELECT id, code_hash, attempts, expires_at < NOW() AS expired
     FROM email_otps
     WHERE user_id = $1 AND purpose = $2 AND consumed_at IS NULL
     ORDER BY created_at DESC LIMIT 1`,
    [userId, purpose]
  );
  if (res.rows.length === 0) return 'invalid';

  const otp = res.rows[0];
  if (otp.expired) return 'expired';
  if (otp.attempts >= OTP_MAX_ATTEMPTS) return 'too_many_attempts';

  const expected = Buffer.from(otp.code_hash, 'hex');
  const actual = Buffer.from(hashCode(userId, purpose, String(code).trim()), 'hex');
  const match = expected.length === actual.length && crypto.timingSafeEqual(expected, actual);

  if (!match) {
    await query('UPDATE email_otps SET attempts = attempts + 1 WHERE id = $1', [otp.id]);
    return otp.attempts + 1 >= OTP_MAX_ATTEMPTS ? 'too_many_attempts' : 'invalid';
  }

  await query('UPDATE email_otps SET consumed_at = NOW() WHERE id = $1', [otp.id]);
  return 'ok';
};
