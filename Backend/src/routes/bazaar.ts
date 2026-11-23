import { Router, Response } from 'express';
import { query } from '../config/db.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { requireMessMember, isActiveHomeMember, MessRequest } from '../middleware/access.js';
import { parseParamId } from '../utils/params.js';
import { isIsoDate, parsePositiveAmount } from '../utils/validation.js';

const router = Router();

// Get all bazaar entries for a mess cycle
router.get('/:messId', authenticateToken, requireMessMember(), async (req: MessRequest, res: Response): Promise<void> => {
  try {
    const result = await query(
      `SELECT b.*, u.name as buyer_name
       FROM bazaar_expenses b
       JOIN users u ON b.buyer_id = u.id
       WHERE b.mess_cycle_id = $1
       ORDER BY b.date DESC, b.id DESC`,
      [req.mess!.id]
    );
    res.json({ success: true, expenses: result.rows });
  } catch (error) {
    console.error('Get bazaar expenses error:', error);
    res.status(500).json({ success: false, code: 'SERVER_ERROR', message: 'Failed to fetch bazaar expenses' });
  }
});

// Add new bazaar entry
router.post('/:messId', authenticateToken, requireMessMember(), async (req: MessRequest, res: Response): Promise<void> => {
  try {
    const mess = req.mess!;
    const { buyer_id, date, amount, items_description } = req.body;
    const amt = parsePositiveAmount(amount);
    const items = typeof items_description === 'string' ? items_description.trim() : '';

    if (amt === null) {
      res.status(400).json({ success: false, code: 'INVALID_AMOUNT', message: 'Amount must be greater than 0' });
      return;
    }
    if (!items || !isIsoDate(date)) {
      res.status(400).json({ success: false, code: 'BAD_REQUEST', message: 'Amount, date, and items required' });
      return;
    }

    const assignedBuyerId = buyer_id ? parseInt(buyer_id, 10) : req.user!.id;
    if (!(await isActiveHomeMember(mess.home_id, assignedBuyerId))) {
      res.status(400).json({ success: false, code: 'NOT_HOME_MEMBER', message: 'Buyer is not a member of this home' });
      return;
    }

    const result = await query(
      `INSERT INTO bazaar_expenses (mess_cycle_id, buyer_id, date, amount, items_description)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [mess.id, assignedBuyerId, date, amt, items.slice(0, 500)]
    );

    res.status(201).json({ success: true, message: 'Bazaar added successfully', expense: result.rows[0] });
  } catch (error) {
    console.error('Add bazaar expense error:', error);
    res.status(500).json({ success: false, code: 'SERVER_ERROR', message: 'Failed to add bazaar expense' });
  }
});

// Delete bazaar entry (only members of the same home)
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const expenseId = parseParamId(req.params.id);
    const result = await query(
      `DELETE FROM bazaar_expenses b
       USING mess_cycles mc, home_members hm
       WHERE b.id = $1
         AND mc.id = b.mess_cycle_id
         AND hm.home_id = mc.home_id AND hm.user_id = $2 AND hm.status = 'active'
       RETURNING b.id`,
      [expenseId, req.user?.id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'Bazaar entry not found' });
      return;
    }
    res.json({ success: true, message: 'Bazaar entry deleted' });
  } catch (error) {
    console.error('Delete bazaar error:', error);
    res.status(500).json({ success: false, code: 'SERVER_ERROR', message: 'Failed to delete expense' });
  }
});

export default router;
