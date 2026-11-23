import { Router, Response } from 'express';
import { query } from '../config/db.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireMessMember, isActiveHomeMember, isDateInMess, MessRequest } from '../middleware/access.js';
import { isIsoDate } from '../utils/validation.js';

const router = Router();

const MEAL_TYPES = ['lunch', 'dinner', 'guest_meals'] as const;
const MENU_TYPES = ['lunch', 'dinner'] as const;

/** Meal counts are 0–10 in steps of 0.5 (half meals are common in messes). */
const clampMeal = (v: unknown): number => {
  const n = parseFloat(String(v));
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(10, Math.round(n * 2) / 2);
};

// Get meal sheet records for a mess cycle
router.get('/:messId', authenticateToken, requireMessMember(), async (req: MessRequest, res: Response): Promise<void> => {
  try {
    const result = await query(
      `SELECT mr.*, u.name as user_name
       FROM meal_records mr
       JOIN users u ON mr.user_id = u.id
       WHERE mr.mess_cycle_id = $1
       ORDER BY mr.date ASC, u.name ASC`,
      [req.mess!.id]
    );
    res.json({ success: true, mealRecords: result.rows });
  } catch (error) {
    console.error('Get meal records error:', error);
    res.status(500).json({ success: false, code: 'SERVER_ERROR', message: 'Failed to fetch meal records' });
  }
});

// Upsert a single meal record for a specific member and date
router.post('/:messId/record', authenticateToken, requireMessMember(), async (req: MessRequest, res: Response): Promise<void> => {
  try {
    const mess = req.mess!;
    const { user_id, date, lunch = 0, dinner = 0, guest_meals = 0, notes } = req.body;
    const targetUserId = parseInt(user_id, 10);

    if (!targetUserId || !isIsoDate(date)) {
      res.status(400).json({ success: false, code: 'BAD_REQUEST', message: 'Valid user ID and date required' });
      return;
    }
    if (!isDateInMess(mess, date)) {
      res.status(400).json({ success: false, code: 'DATE_OUTSIDE_MESS', message: 'Date is outside this mess cycle' });
      return;
    }
    if (!(await isActiveHomeMember(mess.home_id, targetUserId))) {
      res.status(400).json({ success: false, code: 'NOT_HOME_MEMBER', message: 'User is not a member of this home' });
      return;
    }

    const result = await query(
      `INSERT INTO meal_records (mess_cycle_id, user_id, date, breakfast, lunch, dinner, guest_meals, notes, updated_at)
       VALUES ($1, $2, $3, 0, $4, $5, $6, $7, CURRENT_TIMESTAMP)
       ON CONFLICT (mess_cycle_id, user_id, date)
       DO UPDATE SET
         breakfast = 0,
         lunch = EXCLUDED.lunch,
         dinner = EXCLUDED.dinner,
         guest_meals = EXCLUDED.guest_meals,
         notes = EXCLUDED.notes,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [mess.id, targetUserId, date, clampMeal(lunch), clampMeal(dinner), clampMeal(guest_meals), notes || null]
    );

    res.json({ success: true, mealRecord: result.rows[0] });
  } catch (error) {
    console.error('Save meal record error:', error);
    res.status(500).json({ success: false, code: 'SERVER_ERROR', message: 'Failed to save meal record' });
  }
});

// Quick toggle: 1-tap update for the current user (or a target member)
router.post('/:messId/quick-toggle', authenticateToken, requireMessMember(), async (req: MessRequest, res: Response): Promise<void> => {
  try {
    const mess = req.mess!;
    const { target_user_id, date, meal_type, value } = req.body;
    const userId = target_user_id ? parseInt(target_user_id, 10) : req.user!.id;

    if (!isIsoDate(date) || !MEAL_TYPES.includes(meal_type)) {
      res.status(400).json({ success: false, code: 'BAD_REQUEST', message: 'Valid date and meal type required' });
      return;
    }
    if (!isDateInMess(mess, date)) {
      res.status(400).json({ success: false, code: 'DATE_OUTSIDE_MESS', message: 'Date is outside this mess cycle' });
      return;
    }
    if (userId !== req.user!.id && !(await isActiveHomeMember(mess.home_id, userId))) {
      res.status(400).json({ success: false, code: 'NOT_HOME_MEMBER', message: 'User is not a member of this home' });
      return;
    }

    const existing = await query(
      'SELECT lunch, dinner, guest_meals FROM meal_records WHERE mess_cycle_id = $1 AND user_id = $2 AND date = $3',
      [mess.id, userId, date]
    );

    // A missing record means "no meals" — must match what the summary counts and what the UI shows
    let l = 0, d = 0, g = 0;
    if (existing.rows.length > 0) {
      l = parseFloat(existing.rows[0].lunch);
      d = parseFloat(existing.rows[0].dinner);
      g = parseFloat(existing.rows[0].guest_meals);
    }

    const hasValue = value !== undefined && value !== null && value !== '';
    const val = clampMeal(value);
    if (meal_type === 'lunch') l = hasValue ? val : (l > 0 ? 0 : 1);
    if (meal_type === 'dinner') d = hasValue ? val : (d > 0 ? 0 : 1);
    if (meal_type === 'guest_meals') g = hasValue ? val : Math.min(10, g + 1);

    const result = await query(
      `INSERT INTO meal_records (mess_cycle_id, user_id, date, breakfast, lunch, dinner, guest_meals, updated_at)
       VALUES ($1, $2, $3, 0, $4, $5, $6, CURRENT_TIMESTAMP)
       ON CONFLICT (mess_cycle_id, user_id, date)
       DO UPDATE SET
         breakfast = 0,
         lunch = EXCLUDED.lunch,
         dinner = EXCLUDED.dinner,
         guest_meals = EXCLUDED.guest_meals,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [mess.id, userId, date, l, d, g]
    );

    res.json({ success: true, mealRecord: result.rows[0] });
  } catch (error) {
    console.error('Quick toggle error:', error);
    res.status(500).json({ success: false, code: 'SERVER_ERROR', message: 'Failed to toggle meal' });
  }
});

// Get daily menu (Staple, Main dish, Side dish) for a mess cycle
router.get('/:messId/menu', authenticateToken, requireMessMember(), async (req: MessRequest, res: Response): Promise<void> => {
  try {
    const { date } = req.query;
    let queryText = 'SELECT * FROM daily_menus WHERE mess_cycle_id = $1';
    const params: any[] = [req.mess!.id];

    if (isIsoDate(date)) {
      queryText += ' AND date = $2';
      params.push(date);
    }
    queryText += ' ORDER BY date ASC, meal_type ASC';

    const result = await query(queryText, params);
    res.json({ success: true, menus: result.rows });
  } catch (error) {
    console.error('Get daily menu error:', error);
    res.status(500).json({ success: false, code: 'SERVER_ERROR', message: 'Failed to fetch daily menus' });
  }
});

// Upsert daily menu for a date & meal slot
router.post('/:messId/menu', authenticateToken, requireMessMember(), async (req: MessRequest, res: Response): Promise<void> => {
  try {
    const mess = req.mess!;
    const { date, meal_type, staple = '', main_dish = '', side_dish = '', notes = '' } = req.body;

    if (!isIsoDate(date) || !MENU_TYPES.includes(meal_type)) {
      res.status(400).json({ success: false, code: 'BAD_REQUEST', message: 'Valid date and meal type required' });
      return;
    }
    if (!isDateInMess(mess, date)) {
      res.status(400).json({ success: false, code: 'DATE_OUTSIDE_MESS', message: 'Date is outside this mess cycle' });
      return;
    }

    const clean = (v: unknown) => String(v ?? '').trim().slice(0, 200);

    const result = await query(
      `INSERT INTO daily_menus (mess_cycle_id, date, meal_type, staple, main_dish, side_dish, notes, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
       ON CONFLICT (mess_cycle_id, date, meal_type)
       DO UPDATE SET
         staple = EXCLUDED.staple,
         main_dish = EXCLUDED.main_dish,
         side_dish = EXCLUDED.side_dish,
         notes = EXCLUDED.notes,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [mess.id, date, meal_type, clean(staple), clean(main_dish), clean(side_dish), clean(notes)]
    );

    res.json({ success: true, menu: result.rows[0] });
  } catch (error) {
    console.error('Save daily menu error:', error);
    res.status(500).json({ success: false, code: 'SERVER_ERROR', message: 'Failed to save daily menu' });
  }
});

export default router;
