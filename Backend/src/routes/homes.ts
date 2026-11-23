import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { query, pool } from '../config/db.js';
import { JWT_SECRET, env } from '../config/env.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { isActiveHomeMember } from '../middleware/access.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { generateInviteCode } from '../utils/invite.js';
import { parseParamId, parseParamString } from '../utils/params.js';
import { todayDhaka, normalizeEmail, isValidEmailFormat } from '../utils/validation.js';
import { sendMail } from '../services/mailer.js';
import { homeInviteEmail } from '../services/emailTemplates.js';

const router = Router();

const INVITE_TTL_DAYS = 7;
const INVITE_MAX_ATTEMPTS = 5;
const INVITE_RESEND_SECONDS = 60;

const inviteLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });
const acceptLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 15 });

const hashInviteCode = (token: string, code: string) =>
  crypto.createHmac('sha256', JWT_SECRET).update(`invite:${token}:${code}`).digest('hex');

const safeEqualHex = (a: string, b: string) => {
  const x = Buffer.from(a, 'hex');
  const y = Buffer.from(b, 'hex');
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

const fail = (res: Response, status: number, code: string, message: string, extra: Record<string, unknown> = {}) =>
  res.status(status).json({ success: false, code, message, ...extra });

/* ───────────── Create Home (creator becomes manager) ───────────── */
router.post('/', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { name, address } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      fail(res, 400, 'HOME_NAME_REQUIRED', 'Home name is required');
      return;
    }

    // invite_code column is NOT NULL UNIQUE in the schema; keep generating a value for it
    let inviteCode = generateInviteCode();
    while ((await query('SELECT 1 FROM homes WHERE invite_code = $1', [inviteCode])).rows.length > 0) {
      inviteCode = generateInviteCode();
    }

    const homeResult = await query(
      `INSERT INTO homes (name, address, invite_code, created_by_user_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, address, created_at`,
      [name.trim().slice(0, 150), typeof address === 'string' && address.trim() ? address.trim().slice(0, 300) : null, inviteCode, userId]
    );
    const home = homeResult.rows[0];

    await query(`INSERT INTO home_members (home_id, user_id, role) VALUES ($1, $2, 'manager')`, [home.id, userId]);

    res.status(201).json({ success: true, message: 'Home created successfully', home: { ...home, role: 'manager', member_count: 1, mess_count: 0 } });
  } catch (error) {
    console.error('Create home error:', error);
    fail(res, 500, 'SERVER_ERROR', 'Failed to create home');
  }
});

/* ───────────── List current user's homes ───────────── */
router.get('/', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await query(
      `SELECT h.id, h.name, h.address, h.created_at, hm.role,
              (SELECT COUNT(*) FROM home_members WHERE home_id = h.id AND status = 'active')::int AS member_count,
              (SELECT COUNT(*) FROM mess_cycles WHERE home_id = h.id)::int AS mess_count
       FROM homes h
       JOIN home_members hm ON h.id = hm.home_id
       WHERE hm.user_id = $1 AND hm.status = 'active'
       ORDER BY h.created_at DESC`,
      [req.user?.id]
    );
    res.json({ success: true, homes: result.rows });
  } catch (error) {
    console.error('Get user homes error:', error);
    fail(res, 500, 'SERVER_ERROR', 'Failed to fetch homes');
  }
});

/* ───────────── Public invitation preview (from the email link) ───────────── */
router.get('/invites/:token', async (req: Request, res: Response): Promise<void> => {
  try {
    const token = parseParamString(req.params.token);
    const result = await query(
      `SELECT hi.email, hi.expires_at < NOW() AS expired, hi.accepted_at IS NOT NULL AS accepted,
              hi.revoked_at IS NOT NULL AS revoked, h.name AS home_name, u.name AS inviter_name,
              (SELECT COUNT(*) FROM home_members WHERE home_id = h.id AND status = 'active')::int AS member_count
       FROM home_invites hi
       JOIN homes h ON h.id = hi.home_id
       LEFT JOIN users u ON u.id = hi.invited_by
       WHERE hi.token = $1`,
      [token]
    );
    if (result.rows.length === 0) {
      fail(res, 404, 'INVITE_NOT_FOUND', 'Invitation not found');
      return;
    }
    const inv = result.rows[0];
    res.json({
      success: true,
      invite: {
        email: inv.email,
        homeName: inv.home_name,
        inviterName: inv.inviter_name,
        memberCount: inv.member_count,
        status: inv.revoked ? 'revoked' : inv.accepted ? 'accepted' : inv.expired ? 'expired' : 'pending'
      }
    });
  } catch (error) {
    console.error('Invite preview error:', error);
    fail(res, 500, 'SERVER_ERROR', 'Failed to load invitation');
  }
});

/* ───────────── Accept invitation: invited email + 6-digit code ───────────── */
router.post('/invites/accept', authenticateToken, acceptLimit, async (req: AuthRequest, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const userId = req.user!.id;
    const email = normalizeEmail(req.body.email);
    const code = String(req.body.code ?? '').trim();
    const token = typeof req.body.token === 'string' ? req.body.token.trim() : '';

    if (!isValidEmailFormat(email)) {
      fail(res, 400, 'INVALID_EMAIL', 'Please enter a valid email address');
      return;
    }
    if (!/^\d{6}$/.test(code)) {
      fail(res, 400, 'INVALID_CODE', 'Enter the 6-digit code');
      return;
    }

    const me = await client.query('SELECT email FROM users WHERE id = $1', [userId]);
    if (me.rows[0]?.email !== email) {
      fail(res, 403, 'INVITE_EMAIL_MISMATCH', 'This invitation is for a different email. Sign in with the invited email.');
      return;
    }

    const pending = await client.query(
      `SELECT id, home_id, token, code_hash, attempts, expires_at < NOW() AS expired
       FROM home_invites
       WHERE email = $1 AND accepted_at IS NULL AND revoked_at IS NULL ${token ? 'AND token = $2' : ''}
       ORDER BY created_at DESC`,
      token ? [email, token] : [email]
    );

    const live = pending.rows.filter((r) => !r.expired && r.attempts < INVITE_MAX_ATTEMPTS);
    const match = live.find((r) => safeEqualHex(r.code_hash, hashInviteCode(r.token, code)));

    if (!match) {
      if (live.length > 0) {
        await client.query('UPDATE home_invites SET attempts = attempts + 1 WHERE id = ANY($1::int[])', [live.map((r) => r.id)]);
      }
      if (pending.rows.length > 0 && live.length === 0) {
        const allExpired = pending.rows.every((r) => r.expired);
        fail(res, 400, allExpired ? 'INVITE_EXPIRED' : 'TOO_MANY_ATTEMPTS', allExpired ? 'Invitation expired' : 'Too many wrong attempts');
        return;
      }
      fail(res, 400, 'INVALID_CODE', 'Invalid code');
      return;
    }

    await client.query('BEGIN');
    const existing = await client.query('SELECT id, status FROM home_members WHERE home_id = $1 AND user_id = $2', [match.home_id, userId]);
    if (existing.rows.length > 0) {
      await client.query(`UPDATE home_members SET status = 'active' WHERE id = $1`, [existing.rows[0].id]);
    } else {
      await client.query(`INSERT INTO home_members (home_id, user_id, role) VALUES ($1, $2, 'member')`, [match.home_id, userId]);
    }
    await client.query('UPDATE home_invites SET accepted_at = NOW() WHERE id = $1', [match.id]);

    // Add the new member to every running/upcoming mess cycle from today onwards
    await client.query(
      `INSERT INTO meal_records (mess_cycle_id, user_id, date, breakfast, lunch, dinner, guest_meals)
       SELECT mc.id, $2, d::date, 0, 1, 1, 0
       FROM mess_cycles mc
       CROSS JOIN LATERAL generate_series(GREATEST(mc.start_date, $3::date), mc.end_date, INTERVAL '1 day') AS d
       WHERE mc.home_id = $1 AND mc.end_date >= $3::date
       ON CONFLICT (mess_cycle_id, user_id, date) DO NOTHING`,
      [match.home_id, userId, todayDhaka()]
    );
    await client.query('COMMIT');

    res.json({ success: true, message: 'Joined home', homeId: match.home_id });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Accept invite error:', error);
    fail(res, 500, 'SERVER_ERROR', 'Failed to accept invitation');
  } finally {
    client.release();
  }
});

/* ───────────── Single home: details, members, pending invitations ───────────── */
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const homeId = parseParamId(req.params.id);
    const userId = req.user?.id;

    const memberCheck = await query(
      `SELECT role FROM home_members WHERE home_id = $1 AND user_id = $2 AND status = 'active'`,
      [homeId, userId]
    );
    if (memberCheck.rows.length === 0) {
      fail(res, 404, 'HOME_NOT_FOUND', 'Home not found');
      return;
    }

    const homeResult = await query(
      `SELECT h.id, h.name, h.address, h.created_at, u.name AS creator_name
       FROM homes h LEFT JOIN users u ON h.created_by_user_id = u.id
       WHERE h.id = $1`,
      [homeId]
    );
    const membersResult = await query(
      `SELECT hm.id, hm.role, hm.joined_at, u.id AS user_id, u.name, u.email, u.phone, u.avatar_url
       FROM home_members hm JOIN users u ON hm.user_id = u.id
       WHERE hm.home_id = $1 AND hm.status = 'active'
       ORDER BY (hm.role = 'manager') DESC, hm.joined_at ASC`,
      [homeId]
    );
    const invitesResult = await query(
      `SELECT hi.id, hi.email, hi.created_at, hi.expires_at, u.name AS invited_by_name
       FROM home_invites hi LEFT JOIN users u ON u.id = hi.invited_by
       WHERE hi.home_id = $1 AND hi.accepted_at IS NULL AND hi.revoked_at IS NULL AND hi.expires_at > NOW()
       ORDER BY hi.created_at DESC`,
      [homeId]
    );

    res.json({
      success: true,
      home: { ...homeResult.rows[0], role: memberCheck.rows[0].role },
      currentRole: memberCheck.rows[0].role,
      members: membersResult.rows,
      invites: invitesResult.rows
    });
  } catch (error) {
    console.error('Get home details error:', error);
    fail(res, 500, 'SERVER_ERROR', 'Failed to fetch home details');
  }
});

/* ───────────── Invite someone by email (any member can invite) ───────────── */
router.post('/:id/invites', authenticateToken, inviteLimit, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const homeId = parseParamId(req.params.id);
    const inviterId = req.user!.id;
    const email = normalizeEmail(req.body.email);

    if (!(await isActiveHomeMember(homeId, inviterId))) {
      fail(res, 404, 'HOME_NOT_FOUND', 'Home not found');
      return;
    }
    if (!isValidEmailFormat(email)) {
      fail(res, 400, 'INVALID_EMAIL', 'Please enter a valid email address');
      return;
    }

    const already = await query(
      `SELECT 1 FROM home_members hm JOIN users u ON u.id = hm.user_id
       WHERE hm.home_id = $1 AND hm.status = 'active' AND u.email = $2`,
      [homeId, email]
    );
    if (already.rows.length > 0) {
      fail(res, 409, 'ALREADY_MEMBER', 'This person is already a member');
      return;
    }

    const recent = await query(
      `SELECT EXTRACT(EPOCH FROM (NOW() - created_at))::int AS age FROM home_invites
       WHERE home_id = $1 AND email = $2 ORDER BY created_at DESC LIMIT 1`,
      [homeId, email]
    );
    if (recent.rows.length > 0 && recent.rows[0].age < INVITE_RESEND_SECONDS) {
      fail(res, 429, 'RESEND_COOLDOWN', 'Please wait before sending another invitation', {
        retryAfter: INVITE_RESEND_SECONDS - recent.rows[0].age
      });
      return;
    }

    const info = await query(
      `SELECT h.name AS home_name, u.name AS inviter_name, u.language_pref AS inviter_lang,
              (SELECT language_pref FROM users WHERE email = $3) AS invitee_lang
       FROM homes h, users u WHERE h.id = $1 AND u.id = $2`,
      [homeId, inviterId, email]
    );
    const { home_name, inviter_name, inviter_lang, invitee_lang } = info.rows[0];

    const token = crypto.randomBytes(24).toString('hex');
    const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');

    // A new invitation replaces any older pending one for the same email
    await query(
      `UPDATE home_invites SET revoked_at = NOW()
       WHERE home_id = $1 AND email = $2 AND accepted_at IS NULL AND revoked_at IS NULL`,
      [homeId, email]
    );
    const inserted = await query(
      `INSERT INTO home_invites (home_id, email, token, code_hash, invited_by, expires_at)
       VALUES ($1, $2, $3, $4, $5, NOW() + ($6 || ' days')::interval)
       RETURNING id, email, created_at, expires_at`,
      [homeId, email, token, hashInviteCode(token, code), inviterId, String(INVITE_TTL_DAYS)]
    );

    try {
      await sendMail(
        homeInviteEmail({
          to: email,
          inviterName: inviter_name,
          homeName: home_name,
          code,
          link: `${env.clientUrl}/?invite=${token}`,
          days: INVITE_TTL_DAYS,
          lang: invitee_lang || inviter_lang
        })
      );
    } catch (err) {
      console.error('Invite email failed:', err);
      await query('UPDATE home_invites SET revoked_at = NOW() WHERE id = $1', [inserted.rows[0].id]);
      fail(res, 502, 'EMAIL_SEND_FAILED', 'Could not send the invitation email');
      return;
    }

    res.status(201).json({ success: true, message: 'Invitation sent', invite: { ...inserted.rows[0], invited_by_name: inviter_name } });
  } catch (error) {
    console.error('Create invite error:', error);
    fail(res, 500, 'SERVER_ERROR', 'Failed to send invitation');
  }
});

/* ───────────── Cancel a pending invitation ───────────── */
router.delete('/:id/invites/:inviteId', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const homeId = parseParamId(req.params.id);
    if (!(await isActiveHomeMember(homeId, req.user?.id))) {
      fail(res, 404, 'HOME_NOT_FOUND', 'Home not found');
      return;
    }
    const result = await query(
      `UPDATE home_invites SET revoked_at = NOW()
       WHERE id = $1 AND home_id = $2 AND accepted_at IS NULL AND revoked_at IS NULL RETURNING id`,
      [parseParamId(req.params.inviteId), homeId]
    );
    if (result.rows.length === 0) {
      fail(res, 404, 'NOT_FOUND', 'Invitation not found');
      return;
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Revoke invite error:', error);
    fail(res, 500, 'SERVER_ERROR', 'Failed to cancel invitation');
  }
});

export default router;
