import { Router, Response } from 'express';
import { query } from '../config/db.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { requireMessMember, isActiveHomeMember, MessRequest } from '../middleware/access.js';
import { parseParamId } from '../utils/params.js';
import { isIsoDate, addDaysIso, todayDhaka } from '../utils/validation.js';

const router = Router();

const MAX_DURATION_DAYS = 60;

// Create Mess cycle in a home (default 10 days, customizable, any member can create)
router.post('/home/:homeId', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const homeId = parseParamId(req.params.homeId);
    const userId = req.user?.id;
    const { name, start_date, duration_days = 10, manager_id, notes } = req.body;

    if (!(await isActiveHomeMember(homeId, userId))) {
      res.status(403).json({ success: false, code: 'NOT_HOME_MEMBER', message: 'You must be a member of this home to create a mess' });
      return;
    }

    const duration = parseInt(duration_days, 10);
    if (!Number.isInteger(duration) || duration < 1 || duration > MAX_DURATION_DAYS) {
      res.status(400).json({ success: false, code: 'INVALID_DURATION', message: `Duration must be 1-${MAX_DURATION_DAYS} days` });
      return;
    }

    const startDateStr = start_date === undefined || start_date === '' ? todayDhaka() : start_date;
    if (!isIsoDate(startDateStr)) {
      res.status(400).json({ success: false, code: 'INVALID_DATE', message: 'Invalid start date' });
      return;
    }
    const endDateStr = addDaysIso(startDateStr, duration - 1);

    let assignedManagerId = userId;
    if (manager_id) {
      const candidate = parseInt(manager_id, 10);
      if (!(await isActiveHomeMember(homeId, candidate))) {
        res.status(400).json({ success: false, code: 'NOT_HOME_MEMBER', message: 'Manager must be a member of this home' });
        return;
      }
      assignedManagerId = candidate;
    }

    const cycleName = typeof name === 'string' && name.trim() ? name.trim().slice(0, 150) : `${startDateStr} → ${endDateStr}`;

    const result = await query(
      `INSERT INTO mess_cycles (home_id, name, start_date, end_date, duration_days, manager_id, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [homeId, cycleName, startDateStr, endDateStr, duration, assignedManagerId, notes || null]
    );
    const messCycle = result.rows[0];

    // Pre-fill every member's meal sheet (lunch + dinner ON) in a single query
    await query(
      `INSERT INTO meal_records (mess_cycle_id, user_id, date, breakfast, lunch, dinner, guest_meals)
       SELECT $1, hm.user_id, d::date, 0, 1, 1, 0
       FROM home_members hm
       CROSS JOIN generate_series($2::date, $3::date, INTERVAL '1 day') AS d
       WHERE hm.home_id = $4 AND hm.status = 'active'
       ON CONFLICT (mess_cycle_id, user_id, date) DO NOTHING`,
      [messCycle.id, startDateStr, endDateStr, homeId]
    );

    res.status(201).json({ success: true, message: 'Mess created successfully', messCycle });
  } catch (error) {
    console.error('Create mess error:', error);
    res.status(500).json({ success: false, code: 'SERVER_ERROR', message: 'Failed to create mess cycle' });
  }
});

// List all mess cycles for a home
router.get('/home/:homeId', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const homeId = parseParamId(req.params.homeId);

    if (!(await isActiveHomeMember(homeId, req.user?.id))) {
      res.status(403).json({ success: false, code: 'NOT_HOME_MEMBER', message: 'Not authorized for this home' });
      return;
    }

    const result = await query(
      `SELECT mc.*, u.name as manager_name,
              (SELECT COALESCE(SUM(total_meals), 0) FROM meal_records WHERE mess_cycle_id = mc.id)::float as total_meals,
              (SELECT COALESCE(SUM(amount), 0) FROM bazaar_expenses WHERE mess_cycle_id = mc.id)::float as total_bazaar,
              (SELECT COALESCE(SUM(amount), 0) FROM deposits WHERE mess_cycle_id = mc.id)::float as total_deposits
       FROM mess_cycles mc
       LEFT JOIN users u ON mc.manager_id = u.id
       WHERE mc.home_id = $1
       ORDER BY mc.start_date DESC, mc.id DESC`,
      [homeId]
    );

    res.json({ success: true, messCycles: result.rows });
  } catch (error) {
    console.error('Get mess list error:', error);
    res.status(500).json({ success: false, code: 'SERVER_ERROR', message: 'Failed to fetch mess cycles' });
  }
});

// Get single mess cycle detail
router.get('/:id', authenticateToken, requireMessMember('id'), async (req: MessRequest, res: Response): Promise<void> => {
  try {
    const mess = req.mess!;

    const cycleResult = await query(
      `SELECT mc.*, h.name as home_name, u.name as manager_name
       FROM mess_cycles mc
       JOIN homes h ON mc.home_id = h.id
       LEFT JOIN users u ON mc.manager_id = u.id
       WHERE mc.id = $1`,
      [mess.id]
    );
    const messCycle = cycleResult.rows[0];

    const dates: string[] = [];
    for (let d = mess.start_date; d <= mess.end_date; d = addDaysIso(d, 1)) {
      dates.push(d);
    }

    const membersResult = await query(
      `SELECT hm.role, u.id as user_id, u.name, u.email, u.phone
       FROM home_members hm
       JOIN users u ON hm.user_id = u.id
       WHERE hm.home_id = $1 AND hm.status = 'active'
       ORDER BY u.name ASC`,
      [mess.home_id]
    );

    res.json({ success: true, messCycle, dates, members: membersResult.rows });
  } catch (error) {
    console.error('Get mess detail error:', error);
    res.status(500).json({ success: false, code: 'SERVER_ERROR', message: 'Failed to fetch mess details' });
  }
});

export default router;
