import { Router, Response } from 'express';
import { query } from '../config/db.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { parseParamId } from '../utils/params.js';

const router = Router();

// Get meal sheet records for a mess cycle
router.get('/:messId', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const messId = parseParamId(req.params.messId);

    const result = await query(
      `SELECT mr.*, u.name as user_name
       FROM meal_records mr
       JOIN users u ON mr.user_id = u.id
       WHERE mr.mess_cycle_id = $1
       ORDER BY mr.date ASC, u.name ASC`,
      [messId]
    );

    res.json({ success: true, mealRecords: result.rows });
  } catch (error) {
    console.error('Get meal records error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch meal records' });
  }
});

// Upsert a single meal record for a specific user and date
router.post('/:messId/record', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const messId = parseParamId(req.params.messId);
    const { user_id, date, breakfast = 0, lunch = 0, dinner = 0, guest_meals = 0, notes } = req.body;

    if (!user_id || !date) {
      res.status(400).json({ success: false, message: 'User ID and date required' });
      return;
    }

    const b = Math.max(0, parseFloat(breakfast) || 0);
    const l = Math.max(0, parseFloat(lunch) || 0);
    const d = Math.max(0, parseFloat(dinner) || 0);
    const g = Math.max(0, parseFloat(guest_meals) || 0);

    const result = await query(
      `INSERT INTO meal_records (mess_cycle_id, user_id, date, breakfast, lunch, dinner, guest_meals, notes, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
       ON CONFLICT (mess_cycle_id, user_id, date)
       DO UPDATE SET
         breakfast = EXCLUDED.breakfast,
         lunch = EXCLUDED.lunch,
         dinner = EXCLUDED.dinner,
         guest_meals = EXCLUDED.guest_meals,
         notes = EXCLUDED.notes,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [messId, user_id, date, b, l, d, g, notes || null]
    );

    res.json({ success: true, mealRecord: result.rows[0] });
  } catch (error) {
    console.error('Save meal record error:', error);
    res.status(500).json({ success: false, message: 'Failed to save meal record' });
  }
});

// Quick toggle: 1-click update for current user or manager
router.post('/:messId/quick-toggle', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const messId = parseParamId(req.params.messId);
    const currentUserId = req.user?.id;
    const { target_user_id, date, meal_type, value } = req.body;

    const userId = target_user_id || currentUserId;
    if (!date || !meal_type) {
      res.status(400).json({ success: false, message: 'Date and meal type required' });
      return;
    }

    const existing = await query(
      'SELECT * FROM meal_records WHERE mess_cycle_id = $1 AND user_id = $2 AND date = $3',
      [messId, userId, date]
    );

    let b = 0, l = 1, d = 1, g = 0;
    if (existing.rows.length > 0) {
      b = parseFloat(existing.rows[0].breakfast);
      l = parseFloat(existing.rows[0].lunch);
      d = parseFloat(existing.rows[0].dinner);
      g = parseFloat(existing.rows[0].guest_meals);
    }

    const val = parseFloat(value);
    if (meal_type === 'breakfast') b = isNaN(val) ? (b > 0 ? 0 : 1) : val;
    if (meal_type === 'lunch') l = isNaN(val) ? (l > 0 ? 0 : 1) : val;
    if (meal_type === 'dinner') d = isNaN(val) ? (d > 0 ? 0 : 1) : val;
    if (meal_type === 'guest_meals') g = isNaN(val) ? (g + 1) : val;

    const result = await query(
      `INSERT INTO meal_records (mess_cycle_id, user_id, date, breakfast, lunch, dinner, guest_meals, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
       ON CONFLICT (mess_cycle_id, user_id, date)
       DO UPDATE SET
         breakfast = EXCLUDED.breakfast,
         lunch = EXCLUDED.lunch,
         dinner = EXCLUDED.dinner,
         guest_meals = EXCLUDED.guest_meals,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [messId, userId, date, b, l, d, g]
    );

    res.json({ success: true, mealRecord: result.rows[0] });
  } catch (error) {
    console.error('Quick toggle error:', error);
    res.status(500).json({ success: false, message: 'Failed to toggle meal' });
  }
});

export default router;
