import { Router, Response } from 'express';
import { query } from '../config/db.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireMessMember, isActiveHomeMember, MessRequest } from '../middleware/access.js';
import { isIsoDate, parsePositiveAmount } from '../utils/validation.js';

const router = Router();

// Get all deposits for a mess cycle
router.get('/:messId', authenticateToken, requireMessMember(), async (req: MessRequest, res: Response): Promise<void> => {
  try {
    const result = await query(
      `SELECT d.*, u.name as user_name
       FROM deposits d
       JOIN users u ON d.user_id = u.id
       WHERE d.mess_cycle_id = $1
       ORDER BY d.date DESC, d.id DESC`,
      [req.mess!.id]
    );
    res.json({ success: true, deposits: result.rows });
  } catch (error) {
    console.error('Get deposits error:', error);
    res.status(500).json({ success: false, code: 'SERVER_ERROR', message: 'Failed to fetch deposits' });
  }
});

// Add deposit for a member
router.post('/:messId', authenticateToken, requireMessMember(), async (req: MessRequest, res: Response): Promise<void> => {
  try {
    const mess = req.mess!;
    const { user_id, amount, date, notes } = req.body;
    const amt = parsePositiveAmount(amount);

    if (amt === null) {
      res.status(400).json({ success: false, code: 'INVALID_AMOUNT', message: 'Amount must be greater than 0' });
      return;
    }
    if (!isIsoDate(date)) {
      res.status(400).json({ success: false, code: 'BAD_REQUEST', message: 'Valid date required' });
      return;
    }

    const targetUserId = user_id ? parseInt(user_id, 10) : req.user!.id;
    if (!(await isActiveHomeMember(mess.home_id, targetUserId))) {
      res.status(400).json({ success: false, code: 'NOT_HOME_MEMBER', message: 'User is not a member of this home' });
      return;
    }

    const result = await query(
      `INSERT INTO deposits (mess_cycle_id, user_id, amount, date, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [mess.id, targetUserId, amt, date, typeof notes === 'string' && notes.trim() ? notes.trim().slice(0, 500) : null]
    );

    res.status(201).json({ success: true, message: 'Deposit added successfully', deposit: result.rows[0] });
  } catch (error) {
    console.error('Add deposit error:', error);
    res.status(500).json({ success: false, code: 'SERVER_ERROR', message: 'Failed to add deposit' });
  }
});

export default router;
