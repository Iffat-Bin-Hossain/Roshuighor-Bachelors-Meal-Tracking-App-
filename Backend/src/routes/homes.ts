import { Router, Response } from 'express';
import { query } from '../config/db.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { generateInviteCode } from '../utils/invite.js';
import { parseParamId, parseParamString } from '../utils/params.js';

const router = Router();

// Create Home (Creator becomes manager)
router.post('/', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { name, address, description } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ success: false, message: 'Home name is required' });
      return;
    }

    let inviteCode = generateInviteCode();
    let exists = await query('SELECT id FROM homes WHERE invite_code = $1', [inviteCode]);
    while (exists.rows.length > 0) {
      inviteCode = generateInviteCode();
      exists = await query('SELECT id FROM homes WHERE invite_code = $1', [inviteCode]);
    }

    const homeResult = await query(
      `INSERT INTO homes (name, address, description, invite_code, created_by_user_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name.trim(), address?.trim() || null, description?.trim() || null, inviteCode, userId]
    );

    const home = homeResult.rows[0];

    await query(
      `INSERT INTO home_members (home_id, user_id, role)
       VALUES ($1, $2, 'manager')`,
      [home.id, userId]
    );

    res.status(201).json({
      success: true,
      message: 'Home created successfully',
      home
    });
  } catch (error) {
    console.error('Create home error:', error);
    res.status(500).json({ success: false, message: 'Failed to create home' });
  }
});

// List all homes of current user
router.get('/', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    const result = await query(
      `SELECT h.id, h.name, h.address, h.description, h.invite_code, h.created_by_user_id, h.created_at,
              hm.role, hm.joined_at,
              (SELECT COUNT(*) FROM home_members WHERE home_id = h.id AND status = 'active')::int as member_count,
              (SELECT COUNT(*) FROM mess_cycles WHERE home_id = h.id)::int as mess_count
       FROM homes h
       JOIN home_members hm ON h.id = hm.home_id
       WHERE hm.user_id = $1 AND hm.status = 'active'
       ORDER BY h.created_at DESC`,
      [userId]
    );

    res.json({ success: true, homes: result.rows });
  } catch (error) {
    console.error('Get user homes error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch homes' });
  }
});

// Telegram-style Invite Preview
router.get('/invite/:code', async (req, res): Promise<void> => {
  try {
    const code = parseParamString(req.params.code);

    const result = await query(
      `SELECT h.id, h.name, h.address, h.description, h.invite_code,
              u.name as creator_name,
              (SELECT COUNT(*) FROM home_members WHERE home_id = h.id AND status = 'active')::int as member_count
       FROM homes h
       JOIN users u ON h.created_by_user_id = u.id
       WHERE h.invite_code = $1`,
      [code.trim().toUpperCase()]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Invalid invite code or link' });
      return;
    }

    res.json({ success: true, home: result.rows[0] });
  } catch (error) {
    console.error('Invite preview error:', error);
    res.status(500).json({ success: false, message: 'Failed to load invite info' });
  }
});

// Join Home via invite code (Telegram-style join)
router.post('/join', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { invite_code } = req.body;

    if (!invite_code) {
      res.status(400).json({ success: false, message: 'Invite code is required' });
      return;
    }

    const homeResult = await query(
      'SELECT id, name FROM homes WHERE UPPER(invite_code) = UPPER($1)',
      [invite_code.trim()]
    );

    if (homeResult.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Home not found for this invite link' });
      return;
    }

    const home = homeResult.rows[0];

    const existing = await query(
      'SELECT id, status FROM home_members WHERE home_id = $1 AND user_id = $2',
      [home.id, userId]
    );

    if (existing.rows.length > 0) {
      if (existing.rows[0].status === 'active') {
        res.json({
          success: true,
          message: 'Already a member of this home',
          homeId: home.id,
          alreadyMember: true
        });
        return;
      } else {
        await query(
          "UPDATE home_members SET status = 'active' WHERE id = $1",
          [existing.rows[0].id]
        );
      }
    } else {
      await query(
        `INSERT INTO home_members (home_id, user_id, role)
         VALUES ($1, $2, 'member')`,
        [home.id, userId]
      );
    }

    res.json({
      success: true,
      message: `Joined ${home.name} successfully`,
      homeId: home.id
    });
  } catch (error) {
    console.error('Join home error:', error);
    res.status(500).json({ success: false, message: 'Failed to join home' });
  }
});

// Get single Home details & members
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const homeId = parseParamId(req.params.id);
    const userId = req.user?.id;

    const memberCheck = await query(
      'SELECT role FROM home_members WHERE home_id = $1 AND user_id = $2 AND status = $3',
      [homeId, userId, 'active']
    );

    if (memberCheck.rows.length === 0) {
      res.status(403).json({ success: false, message: 'Not a member of this home' });
      return;
    }

    const homeResult = await query(
      `SELECT h.*, u.name as creator_name
       FROM homes h
       JOIN users u ON h.created_by_user_id = u.id
       WHERE h.id = $1`,
      [homeId]
    );

    if (homeResult.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Home not found' });
      return;
    }

    const membersResult = await query(
      `SELECT hm.id, hm.role, hm.joined_at, u.id as user_id, u.name, u.email, u.phone, u.avatar_url
       FROM home_members hm
       JOIN users u ON hm.user_id = u.id
       WHERE hm.home_id = $1 AND hm.status = 'active'
       ORDER BY hm.role DESC, hm.joined_at ASC`,
      [homeId]
    );

    res.json({
      success: true,
      home: homeResult.rows[0],
      currentRole: memberCheck.rows[0].role,
      members: membersResult.rows
    });
  } catch (error) {
    console.error('Get home details error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch home details' });
  }
});

export default router;
