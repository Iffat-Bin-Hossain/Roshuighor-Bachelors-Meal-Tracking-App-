import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../config/db.js';
import { authenticateToken, AuthRequest, signToken } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { sendMail } from '../services/mailer.js';
import {
  verificationEmail,
  passwordResetEmail,
  welcomeEmail,
  passwordChangedEmail
} from '../services/emailTemplates.js';
import { issueOtp, consumeOtp, OtpCooldownError, OtpPurpose, OTP_TTL_MINUTES } from '../services/otp.js';
import {
  normalizeEmail,
  isValidEmailFormat,
  checkEmailDeliverable,
  isStrongPassword,
  isValidName
} from '../utils/validation.js';

const router = Router();

// Brute-force / abuse protection on public auth endpoints
const strictLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });
const loginLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });

const PUBLIC_USER_FIELDS = 'id, name, email, phone, avatar_url, language_pref, theme_pref, email_verified, created_at';

const fail = (res: Response, status: number, code: string, message: string, extra: Record<string, unknown> = {}) =>
  res.status(status).json({ success: false, code, message, ...extra });

const publicUser = (u: any) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  phone: u.phone,
  avatar_url: u.avatar_url ?? null,
  language_pref: u.language_pref,
  theme_pref: u.theme_pref,
  email_verified: u.email_verified
});

/** Issues a code and emails it. Returns null on success, or an error response descriptor. */
const sendOtpEmail = async (
  user: { id: number; name: string; email: string; language_pref?: string },
  purpose: OtpPurpose
): Promise<{ status: number; code: string; message: string; retryAfter?: number } | null> => {
  try {
    const code = await issueOtp(user.id, purpose);
    const build = purpose === 'verify' ? verificationEmail : passwordResetEmail;
    await sendMail(build({ to: user.email, name: user.name, code, minutes: OTP_TTL_MINUTES, lang: user.language_pref }));
    return null;
  } catch (err) {
    if (err instanceof OtpCooldownError) {
      return { status: 429, code: 'RESEND_COOLDOWN', message: 'Please wait before requesting another code', retryAfter: err.retryAfter };
    }
    console.error(`Failed to send ${purpose} email:`, err);
    return { status: 502, code: 'EMAIL_SEND_FAILED', message: 'Could not send email. Please try again shortly.' };
  }
};

const otpFailure = (res: Response, result: string) => {
  if (result === 'expired') return fail(res, 400, 'CODE_EXPIRED', 'Code has expired. Request a new one.');
  if (result === 'too_many_attempts') return fail(res, 429, 'TOO_MANY_ATTEMPTS', 'Too many wrong attempts. Request a new code.');
  return fail(res, 400, 'INVALID_CODE', 'Invalid code');
};

/* ───────────── Sign Up: creates an unverified account and emails a 6-digit code ───────────── */
router.post('/signup', strictLimit, async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, phone, password, language_pref, theme_pref } = req.body;
    const email = normalizeEmail(req.body.email);
    const cleanName = typeof name === 'string' ? name.trim().replace(/\s+/g, ' ') : '';
    const lang = language_pref === 'en' ? 'en' : 'bn';
    const theme = theme_pref === 'dark' ? 'dark' : 'light';

    if (!cleanName || !isValidName(cleanName)) {
      fail(res, 400, 'INVALID_NAME', 'Please enter a valid name');
      return;
    }
    if (!isValidEmailFormat(email)) {
      fail(res, 400, 'INVALID_EMAIL', 'Please enter a valid email address');
      return;
    }
    if (!isStrongPassword(password)) {
      fail(res, 400, 'WEAK_PASSWORD', 'Password must be at least 8 characters with letters and numbers');
      return;
    }
    const cleanPhone = typeof phone === 'string' && phone.trim() ? phone.trim() : null;
    if (cleanPhone && !/^\+?[0-9\s-]{7,20}$/.test(cleanPhone)) {
      fail(res, 400, 'INVALID_PHONE', 'Please enter a valid phone number');
      return;
    }

    const deliverable = await checkEmailDeliverable(email);
    if (deliverable === 'disposable') {
      fail(res, 400, 'DISPOSABLE_EMAIL', 'Temporary email addresses are not allowed');
      return;
    }
    if (deliverable === 'no_mail_server') {
      fail(res, 400, 'EMAIL_UNDELIVERABLE', 'This email domain cannot receive mail');
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const existing = await query('SELECT id, email_verified FROM users WHERE email = $1', [email]);

    let user;
    if (existing.rows.length > 0) {
      if (existing.rows[0].email_verified) {
        fail(res, 409, 'EMAIL_TAKEN', 'Email already registered');
        return;
      }
      // Unverified leftover signup: let the real owner of the inbox start over
      const updated = await query(
        `UPDATE users SET name = $1, phone = $2, password_hash = $3, language_pref = $4, theme_pref = $5
         WHERE id = $6 RETURNING ${PUBLIC_USER_FIELDS}`,
        [cleanName, cleanPhone, passwordHash, lang, theme, existing.rows[0].id]
      );
      user = updated.rows[0];
    } else {
      const inserted = await query(
        `INSERT INTO users (name, email, phone, password_hash, language_pref, theme_pref, email_verified)
         VALUES ($1, $2, $3, $4, $5, $6, FALSE)
         RETURNING ${PUBLIC_USER_FIELDS}`,
        [cleanName, email, cleanPhone, passwordHash, lang, theme]
      );
      user = inserted.rows[0];
    }

    const mailError = await sendOtpEmail(user, 'verify');
    if (mailError && mailError.code !== 'RESEND_COOLDOWN') {
      fail(res, mailError.status, mailError.code, mailError.message);
      return;
    }

    res.status(201).json({
      success: true,
      requiresVerification: true,
      email: user.email,
      message: 'Account created. Check your email for the verification code.'
    });
  } catch (error: any) {
    if (error?.code === '23505') {
      fail(res, 409, 'EMAIL_TAKEN', 'Email already registered');
      return;
    }
    console.error('Signup error:', error);
    fail(res, 500, 'SERVER_ERROR', 'Server error during signup');
  }
});

/* ───────────── Verify email with code → signs the user in ───────────── */
router.post('/verify-email', loginLimit, async (req: Request, res: Response): Promise<void> => {
  try {
    const email = normalizeEmail(req.body.email);
    const code = String(req.body.code ?? '').trim();
    if (!email || !/^\d{6}$/.test(code)) {
      fail(res, 400, 'INVALID_CODE', 'Enter the 6-digit code');
      return;
    }

    const result = await query(`SELECT ${PUBLIC_USER_FIELDS} FROM users WHERE email = $1`, [email]);
    if (result.rows.length === 0) {
      fail(res, 400, 'INVALID_CODE', 'Invalid code');
      return;
    }
    const user = result.rows[0];
    if (user.email_verified) {
      fail(res, 400, 'ALREADY_VERIFIED', 'Email already verified. Please sign in.');
      return;
    }

    const check = await consumeOtp(user.id, 'verify', code);
    if (check !== 'ok') {
      otpFailure(res, check);
      return;
    }

    await query('UPDATE users SET email_verified = TRUE WHERE id = $1', [user.id]);
    user.email_verified = true;

    sendMail(welcomeEmail({ to: user.email, name: user.name, lang: user.language_pref })).catch((err) =>
      console.error('Welcome email failed:', err)
    );

    res.json({ success: true, message: 'Email verified', token: signToken(user), user: publicUser(user) });
  } catch (error) {
    console.error('Verify email error:', error);
    fail(res, 500, 'SERVER_ERROR', 'Server error during verification');
  }
});

/* ───────────── Resend verification code ───────────── */
router.post('/resend-verification', strictLimit, async (req: Request, res: Response): Promise<void> => {
  try {
    const email = normalizeEmail(req.body.email);
    const result = await query(
      'SELECT id, name, email, language_pref FROM users WHERE email = $1 AND email_verified = FALSE',
      [email]
    );
    if (result.rows.length > 0) {
      const mailError = await sendOtpEmail(result.rows[0], 'verify');
      if (mailError) {
        fail(res, mailError.status, mailError.code, mailError.message, mailError.retryAfter ? { retryAfter: mailError.retryAfter } : {});
        return;
      }
    }
    // Same response whether or not the account exists (prevents email enumeration)
    res.json({ success: true, message: 'If the account needs verification, a new code has been sent.' });
  } catch (error) {
    console.error('Resend verification error:', error);
    fail(res, 500, 'SERVER_ERROR', 'Server error');
  }
});

/* ───────────── Sign In ───────────── */
router.post('/signin', loginLimit, async (req: Request, res: Response): Promise<void> => {
  try {
    const email = normalizeEmail(req.body.email);
    const { password } = req.body;

    if (!email || typeof password !== 'string' || !password) {
      fail(res, 400, 'MISSING_FIELDS', 'Email and password required');
      return;
    }

    const result = await query(`SELECT ${PUBLIC_USER_FIELDS}, password_hash FROM users WHERE email = $1`, [email]);
    const user = result.rows[0];
    const isMatch = user ? await bcrypt.compare(password, user.password_hash) : false;

    if (!user || !isMatch) {
      fail(res, 401, 'INVALID_CREDENTIALS', 'Invalid email or password');
      return;
    }

    if (!user.email_verified) {
      // Password was correct, so it's safe to reveal the account state and send a fresh code
      const mailError = await sendOtpEmail(user, 'verify');
      fail(res, 403, 'EMAIL_NOT_VERIFIED', 'Please verify your email first', {
        email: user.email,
        codeSent: !mailError
      });
      return;
    }

    res.json({ success: true, message: 'Signed in successfully', token: signToken(user), user: publicUser(user) });
  } catch (error) {
    console.error('Signin error:', error);
    fail(res, 500, 'SERVER_ERROR', 'Server error during signin');
  }
});

/* ───────────── Forgot password: email a reset code ───────────── */
router.post('/forgot-password', strictLimit, async (req: Request, res: Response): Promise<void> => {
  try {
    const email = normalizeEmail(req.body.email);
    if (!isValidEmailFormat(email)) {
      fail(res, 400, 'INVALID_EMAIL', 'Please enter a valid email address');
      return;
    }

    const result = await query('SELECT id, name, email, language_pref FROM users WHERE email = $1', [email]);
    if (result.rows.length > 0) {
      const mailError = await sendOtpEmail(result.rows[0], 'reset');
      if (mailError) {
        fail(res, mailError.status, mailError.code, mailError.message, mailError.retryAfter ? { retryAfter: mailError.retryAfter } : {});
        return;
      }
    }
    // Generic response so attackers can't discover which emails are registered
    res.json({ success: true, message: 'If an account exists for this email, a reset code has been sent.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    fail(res, 500, 'SERVER_ERROR', 'Server error');
  }
});

/* ───────────── Reset password with code → signs the user in ───────────── */
router.post('/reset-password', loginLimit, async (req: Request, res: Response): Promise<void> => {
  try {
    const email = normalizeEmail(req.body.email);
    const code = String(req.body.code ?? '').trim();
    const { password } = req.body;

    if (!email || !/^\d{6}$/.test(code)) {
      fail(res, 400, 'INVALID_CODE', 'Enter the 6-digit code');
      return;
    }
    if (!isStrongPassword(password)) {
      fail(res, 400, 'WEAK_PASSWORD', 'Password must be at least 8 characters with letters and numbers');
      return;
    }

    const result = await query(`SELECT ${PUBLIC_USER_FIELDS} FROM users WHERE email = $1`, [email]);
    if (result.rows.length === 0) {
      fail(res, 400, 'INVALID_CODE', 'Invalid code');
      return;
    }
    const user = result.rows[0];

    const check = await consumeOtp(user.id, 'reset', code);
    if (check !== 'ok') {
      otpFailure(res, check);
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    // Receiving the code proves inbox ownership, so the email is verified too.
    // password_changed_at invalidates every token issued before now (signs out other devices).
    await query(
      `UPDATE users SET password_hash = $1, email_verified = TRUE, password_changed_at = date_trunc('second', NOW()) WHERE id = $2`,
      [passwordHash, user.id]
    );
    // Drop any other outstanding reset codes
    await query(`UPDATE email_otps SET consumed_at = NOW() WHERE user_id = $1 AND consumed_at IS NULL`, [user.id]);
    user.email_verified = true;

    sendMail(passwordChangedEmail({ to: user.email, name: user.name, lang: user.language_pref })).catch((err) =>
      console.error('Password-changed email failed:', err)
    );

    res.json({ success: true, message: 'Password updated', token: signToken(user), user: publicUser(user) });
  } catch (error) {
    console.error('Reset password error:', error);
    fail(res, 500, 'SERVER_ERROR', 'Server error');
  }
});

/* ───────────── Current user ───────────── */
router.get('/me', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await query(`SELECT ${PUBLIC_USER_FIELDS} FROM users WHERE id = $1`, [req.user?.id]);
    if (result.rows.length === 0) {
      fail(res, 404, 'USER_NOT_FOUND', 'User not found');
      return;
    }
    res.json({ success: true, user: publicUser(result.rows[0]) });
  } catch (error) {
    console.error('Me endpoint error:', error);
    fail(res, 500, 'SERVER_ERROR', 'Server error');
  }
});

/* ───────────── Preferences (language / theme) ───────────── */
router.patch('/preferences', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { language_pref, theme_pref } = req.body;
    const lang = language_pref === 'bn' || language_pref === 'en' ? language_pref : null;
    const theme = theme_pref === 'light' || theme_pref === 'dark' ? theme_pref : null;

    const result = await query(
      `UPDATE users
       SET language_pref = COALESCE($1, language_pref),
           theme_pref = COALESCE($2, theme_pref)
       WHERE id = $3
       RETURNING ${PUBLIC_USER_FIELDS}`,
      [lang, theme, req.user?.id]
    );

    res.json({ success: true, user: publicUser(result.rows[0]) });
  } catch (error) {
    console.error('Preferences error:', error);
    fail(res, 500, 'SERVER_ERROR', 'Failed to update preferences');
  }
});

export default router;
