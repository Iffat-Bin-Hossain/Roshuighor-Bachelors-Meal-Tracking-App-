import dns from 'dns/promises';

// Practical RFC-5322 subset: local@domain.tld, no spaces, no consecutive dots, TLD ≥ 2 letters
const EMAIL_RE = /^[A-Za-z0-9](?:[A-Za-z0-9._%+-]{0,62}[A-Za-z0-9_%+-])?@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,24}$/;

export const normalizeEmail = (email: unknown): string =>
  typeof email === 'string' ? email.trim().toLowerCase() : '';

export const isValidEmailFormat = (email: string): boolean =>
  email.length <= 150 && EMAIL_RE.test(email) && !email.includes('..');

const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com', 'guerrillamail.com', '10minutemail.com', 'tempmail.com', 'temp-mail.org',
  'yopmail.com', 'trashmail.com', 'getnada.com', 'sharklasers.com', 'throwawaymail.com',
  'dispostable.com', 'maildrop.cc', 'fakeinbox.com', 'mailnesia.com', 'tempail.com'
]);

const withTimeout = <T>(p: Promise<T>, ms: number): Promise<T> =>
  Promise.race([p, new Promise<T>((_, reject) => setTimeout(() => reject(new Error('DNS_TIMEOUT')), ms))]);

/**
 * Checks that the email's domain can actually receive mail (has MX, or falls back to an A/AAAA record).
 * Returns 'ok' | 'disposable' | 'no_mail_server'. Network/DNS failures are treated as 'ok'
 * so an offline DNS resolver never blocks a legitimate signup — the verification code is the real proof.
 */
export const checkEmailDeliverable = async (email: string): Promise<'ok' | 'disposable' | 'no_mail_server'> => {
  const domain = email.split('@')[1];
  if (!domain) return 'no_mail_server';
  if (DISPOSABLE_DOMAINS.has(domain)) return 'disposable';

  const definitelyMissing = (err: any) => err?.code === 'ENOTFOUND' || err?.code === 'ENODATA';

  try {
    const mx = await withTimeout(dns.resolveMx(domain), 4000);
    if (mx.some((r) => r.exchange && r.exchange !== '.')) return 'ok';
    return 'no_mail_server'; // Null MX (RFC 7505): domain explicitly accepts no mail
  } catch (err: any) {
    if (!definitelyMissing(err)) return 'ok';
  }

  try {
    await withTimeout(dns.resolve(domain), 4000);
    return 'ok';
  } catch (err: any) {
    return definitelyMissing(err) ? 'no_mail_server' : 'ok';
  }
};

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 72; // bcrypt ignores bytes beyond 72

/** At least 8 chars, containing at least one letter and one digit. */
export const isStrongPassword = (pw: unknown): pw is string =>
  typeof pw === 'string' &&
  pw.length >= PASSWORD_MIN &&
  Buffer.byteLength(pw, 'utf8') <= PASSWORD_MAX &&
  /\p{L}/u.test(pw) &&
  /\d/.test(pw);

const NAME_RE = /^[\p{L}\p{M}\s.'-]{2,100}$/u;
export const isValidName = (name: string): boolean => NAME_RE.test(name);

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const isIsoDate = (value: unknown): value is string => {
  if (typeof value !== 'string' || !ISO_DATE_RE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
};

/** Adds days to a YYYY-MM-DD string using pure UTC math (timezone-independent). */
export const addDaysIso = (iso: string, days: number): string => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

/** Today's date in Bangladesh time as YYYY-MM-DD. */
export const todayDhaka = (): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(new Date());

export const parsePositiveAmount = (value: unknown): number | null => {
  const n = typeof value === 'number' ? value : parseFloat(String(value));
  if (!Number.isFinite(n) || n <= 0 || n > 10_000_000) return null;
  return Math.round(n * 100) / 100;
};
