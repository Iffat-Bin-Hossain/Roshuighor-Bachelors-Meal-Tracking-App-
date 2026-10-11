import { Router } from 'express';
import { query } from '../config/db.js';
import { authenticateToken } from '../middleware/auth.js';
import { parseParamId } from '../utils/params.js';
const router = Router();
// Get all deposits for a mess cycle
router.get('/:messId', authenticateToken, async (req, res) => {
    try {
        const messId = parseParamId(req.params.messId);
        const result = await query(`SELECT d.*, u.name as user_name
       FROM deposits d
       JOIN users u ON d.user_id = u.id
       WHERE d.mess_cycle_id = $1
       ORDER BY d.date DESC, d.id DESC`, [messId]);
        res.json({ success: true, deposits: result.rows });
    }
    catch (error) {
        console.error('Get deposits error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch deposits' });
    }
});
// Add deposit for a member
router.post('/:messId', authenticateToken, async (req, res) => {
    try {
        const messId = parseParamId(req.params.messId);
        const currentUserId = req.user?.id;
        const { user_id, amount, date, notes } = req.body;
        if (!amount || !date) {
            res.status(400).json({ success: false, message: 'Amount and date required' });
            return;
        }
        const targetUserId = user_id ? parseInt(user_id, 10) : currentUserId;
        const result = await query(`INSERT INTO deposits (mess_cycle_id, user_id, amount, date, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`, [messId, targetUserId, parseFloat(amount), date, notes || null]);
        res.status(201).json({
            success: true,
            message: 'Deposit added successfully',
            deposit: result.rows[0]
        });
    }
    catch (error) {
        console.error('Add deposit error:', error);
        res.status(500).json({ success: false, message: 'Failed to add deposit' });
    }
});
export default router;
