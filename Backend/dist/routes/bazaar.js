import { Router } from 'express';
import { query } from '../config/db.js';
import { authenticateToken } from '../middleware/auth.js';
import { parseParamId } from '../utils/params.js';
const router = Router();
// Get all bazaar entries for a mess cycle
router.get('/:messId', authenticateToken, async (req, res) => {
    try {
        const messId = parseParamId(req.params.messId);
        const result = await query(`SELECT b.*, u.name as buyer_name
       FROM bazaar_expenses b
       JOIN users u ON b.buyer_id = u.id
       WHERE b.mess_cycle_id = $1
       ORDER BY b.date DESC, b.id DESC`, [messId]);
        res.json({ success: true, expenses: result.rows });
    }
    catch (error) {
        console.error('Get bazaar expenses error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch bazaar expenses' });
    }
});
// Add new bazaar entry
router.post('/:messId', authenticateToken, async (req, res) => {
    try {
        const messId = parseParamId(req.params.messId);
        const userId = req.user?.id;
        const { buyer_id, date, amount, items_description } = req.body;
        if (!amount || !items_description || !date) {
            res.status(400).json({ success: false, message: 'Amount, date, and items required' });
            return;
        }
        const assignedBuyerId = buyer_id ? parseInt(buyer_id, 10) : userId;
        const result = await query(`INSERT INTO bazaar_expenses (mess_cycle_id, buyer_id, date, amount, items_description)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`, [messId, assignedBuyerId, date, parseFloat(amount), items_description.trim()]);
        res.status(201).json({
            success: true,
            message: 'Bazaar added successfully',
            expense: result.rows[0]
        });
    }
    catch (error) {
        console.error('Add bazaar expense error:', error);
        res.status(500).json({ success: false, message: 'Failed to add bazaar expense' });
    }
});
// Delete bazaar entry
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const expenseId = parseParamId(req.params.id);
        await query('DELETE FROM bazaar_expenses WHERE id = $1', [expenseId]);
        res.json({ success: true, message: 'Bazaar entry deleted' });
    }
    catch (error) {
        console.error('Delete bazaar error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete expense' });
    }
});
export default router;
