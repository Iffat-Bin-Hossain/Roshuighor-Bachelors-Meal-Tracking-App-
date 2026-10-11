import { Router } from 'express';
import { query } from '../config/db.js';
import { authenticateToken } from '../middleware/auth.js';
import { parseParamId } from '../utils/params.js';
const router = Router();
// Full summary & settlement calculations for a mess cycle
router.get('/:messId', authenticateToken, async (req, res) => {
    try {
        const messId = parseParamId(req.params.messId);
        // 1. Fetch Mess Cycle
        const cycleRes = await query('SELECT * FROM mess_cycles WHERE id = $1', [messId]);
        if (cycleRes.rows.length === 0) {
            res.status(404).json({ success: false, message: 'Mess not found' });
            return;
        }
        const mess = cycleRes.rows[0];
        // 2. Fetch Members of this home
        const membersRes = await query(`SELECT u.id, u.name, u.email, u.phone
       FROM home_members hm
       JOIN users u ON hm.user_id = u.id
       WHERE hm.home_id = $1 AND hm.status = 'active'
       ORDER BY u.name ASC`, [mess.home_id]);
        // 3. Total Bazaar Expenses
        const bazaarRes = await query('SELECT COALESCE(SUM(amount), 0) as total_bazaar FROM bazaar_expenses WHERE mess_cycle_id = $1', [messId]);
        const totalBazaar = parseFloat(bazaarRes.rows[0].total_bazaar);
        // 4. Total Deposits
        const depositRes = await query('SELECT COALESCE(SUM(amount), 0) as total_deposits FROM deposits WHERE mess_cycle_id = $1', [messId]);
        const totalDeposits = parseFloat(depositRes.rows[0].total_deposits);
        // 5. Total Meals & Per Member Meals
        const mealsRes = await query(`SELECT user_id,
              COALESCE(SUM(breakfast), 0) as breakfast,
              COALESCE(SUM(lunch), 0) as lunch,
              COALESCE(SUM(dinner), 0) as dinner,
              COALESCE(SUM(guest_meals), 0) as guest_meals,
              COALESCE(SUM(total_meals), 0) as total_meals
       FROM meal_records
       WHERE mess_cycle_id = $1
       GROUP BY user_id`, [messId]);
        const userMealMap = {};
        let totalMealsCount = 0;
        mealsRes.rows.forEach((r) => {
            const uid = parseInt(r.user_id, 10);
            const total = parseFloat(r.total_meals);
            userMealMap[uid] = {
                breakfast: parseFloat(r.breakfast),
                lunch: parseFloat(r.lunch),
                dinner: parseFloat(r.dinner),
                guest: parseFloat(r.guest_meals),
                total
            };
            totalMealsCount += total;
        });
        // 6. Per Member Deposits
        const userDepositRes = await query(`SELECT user_id, COALESCE(SUM(amount), 0) as total_deposit
       FROM deposits
       WHERE mess_cycle_id = $1
       GROUP BY user_id`, [messId]);
        const userDepositMap = {};
        userDepositRes.rows.forEach((r) => {
            userDepositMap[parseInt(r.user_id, 10)] = parseFloat(r.total_deposit);
        });
        // 7. Calculate Meal Rate
        const mealRate = totalMealsCount > 0 ? totalBazaar / totalMealsCount : 0;
        // 8. Individual Member Breakdown
        const memberCalculations = membersRes.rows.map((m) => {
            const uid = m.id;
            const mealData = userMealMap[uid] || { breakfast: 0, lunch: 0, dinner: 0, guest: 0, total: 0 };
            const deposit = userDepositMap[uid] || 0;
            const mealCost = mealData.total * mealRate;
            const balance = deposit - mealCost; // >0 means refund due, <0 means owe mess
            return {
                userId: uid,
                name: m.name,
                email: m.email,
                phone: m.phone,
                meals: mealData,
                deposit: Number(deposit.toFixed(2)),
                mealCost: Number(mealCost.toFixed(2)),
                balance: Number(balance.toFixed(2)),
                status: balance >= 0 ? 'surplus' : 'due'
            };
        });
        res.json({
            success: true,
            summary: {
                messId,
                messName: mess.name,
                startDate: mess.start_date,
                endDate: mess.end_date,
                durationDays: mess.duration_days,
                totalMeals: Number(totalMealsCount.toFixed(1)),
                totalBazaar: Number(totalBazaar.toFixed(2)),
                totalDeposits: Number(totalDeposits.toFixed(2)),
                mealRate: Number(mealRate.toFixed(2)),
                memberCalculations
            }
        });
    }
    catch (error) {
        console.error('Summary calculation error:', error);
        res.status(500).json({ success: false, message: 'Failed to calculate summary' });
    }
});
export default router;
