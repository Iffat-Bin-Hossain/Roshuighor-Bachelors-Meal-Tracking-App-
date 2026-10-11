import { Router, Response } from 'express';
import { query } from '../config/db.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { parseParamId } from '../utils/params.js';

const router = Router();

// Create Mess cycle in a home (by default 10 days, customizable, everyone in a home can create)
router.post('/home/:homeId', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const homeId = parseParamId(req.params.homeId);
    const userId = req.user?.id;
    const { name, start_date, end_date, duration_days = 10, manager_id, notes } = req.body;

    const memberCheck = await query(
      'SELECT id, role FROM home_members WHERE home_id = $1 AND user_id = $2 AND status = $3',
      [homeId, userId, 'active']
    );

    if (memberCheck.rows.length === 0) {
      res.status(403).json({ success: false, message: 'You must be a member of this home to create a mess' });
      return;
    }

    const duration = parseInt(duration_days, 10) || 10;
    
    const startDateObj = start_date ? new Date(start_date) : new Date();
    let endDateObj: Date;

    if (end_date) {
      endDateObj = new Date(end_date);
    } else {
      endDateObj = new Date(startDateObj);
      endDateObj.setDate(startDateObj.getDate() + (duration - 1));
    }

    const startDateStr = startDateObj.toISOString().split('T')[0];
    const endDateStr = endDateObj.toISOString().split('T')[0];

    const cycleName = name && name.trim() ? name.trim() : `${duration} Days Mess (${startDateStr})`;
    const assignedManagerId = manager_id ? parseInt(manager_id, 10) : userId;

    const result = await query(
      `INSERT INTO mess_cycles (home_id, name, start_date, end_date, duration_days, manager_id, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [homeId, cycleName, startDateStr, endDateStr, duration, assignedManagerId, notes || null]
    );

    const messCycle = result.rows[0];

    const members = await query(
      'SELECT user_id FROM home_members WHERE home_id = $1 AND status = $2',
      [homeId, 'active']
    );

    const currentIter = new Date(startDateStr);
    const endIter = new Date(endDateStr);

    while (currentIter <= endIter) {
      const dateStr = currentIter.toISOString().split('T')[0];
      for (const m of members.rows) {
        await query(
          `INSERT INTO meal_records (mess_cycle_id, user_id, date, breakfast, lunch, dinner, guest_meals)
           VALUES ($1, $2, $3, 0.0, 1.0, 1.0, 0.0)
           ON CONFLICT (mess_cycle_id, user_id, date) DO NOTHING`,
          [messCycle.id, m.user_id, dateStr]
        );
      }
      currentIter.setDate(currentIter.getDate() + 1);
    }

    res.status(201).json({
      success: true,
      message: 'Mess created successfully (10-day default)',
      messCycle
    });
  } catch (error) {
    console.error('Create mess error:', error);
    res.status(500).json({ success: false, message: 'Failed to create mess cycle' });
  }
});

// List all mess cycles for a home
router.get('/home/:homeId', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const homeId = parseParamId(req.params.homeId);
    const userId = req.user?.id;

    const memberCheck = await query(
      'SELECT id FROM home_members WHERE home_id = $1 AND user_id = $2 AND status = $3',
      [homeId, userId, 'active']
    );

    if (memberCheck.rows.length === 0) {
      res.status(403).json({ success: false, message: 'Not authorized for this home' });
      return;
    }

    const result = await query(
      `SELECT mc.*, u.name as manager_name,
              (SELECT COALESCE(SUM(total_meals), 0) FROM meal_records WHERE mess_cycle_id = mc.id) as total_meals,
              (SELECT COALESCE(SUM(amount), 0) FROM bazaar_expenses WHERE mess_cycle_id = mc.id) as total_bazaar,
              (SELECT COALESCE(SUM(amount), 0) FROM deposits WHERE mess_cycle_id = mc.id) as total_deposits
       FROM mess_cycles mc
       LEFT JOIN users u ON mc.manager_id = u.id
       WHERE mc.home_id = $1
       ORDER BY mc.start_date DESC, mc.id DESC`,
      [homeId]
    );

    res.json({ success: true, messCycles: result.rows });
  } catch (error) {
    console.error('Get mess list error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch mess cycles' });
  }
});

// Get single mess cycle detail
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const messId = parseParamId(req.params.id);

    const cycleResult = await query(
      `SELECT mc.*, h.name as home_name, u.name as manager_name
       FROM mess_cycles mc
       JOIN homes h ON mc.home_id = h.id
       LEFT JOIN users u ON mc.manager_id = u.id
       WHERE mc.id = $1`,
      [messId]
    );

    if (cycleResult.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Mess cycle not found' });
      return;
    }

    const messCycle = cycleResult.rows[0];

    const dates: string[] = [];
    const cur = new Date(messCycle.start_date);
    const end = new Date(messCycle.end_date);
    while (cur <= end) {
      dates.push(cur.toISOString().split('T')[0]);
      cur.setDate(cur.getDate() + 1);
    }

    const membersResult = await query(
      `SELECT hm.role, u.id as user_id, u.name, u.email, u.phone
       FROM home_members hm
       JOIN users u ON hm.user_id = u.id
       WHERE hm.home_id = $1 AND hm.status = 'active'
       ORDER BY u.name ASC`,
      [messCycle.home_id]
    );

    res.json({
      success: true,
      messCycle,
      dates,
      members: membersResult.rows
    });
  } catch (error) {
    console.error('Get mess detail error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch mess details' });
  }
});

export default router;
