import { Response, NextFunction } from 'express';
import { query } from '../config/db.js';
import { AuthRequest } from './auth.js';
import { parseParamId } from '../utils/params.js';

export interface MessContext {
  id: number;
  home_id: number;
  start_date: string;
  end_date: string;
  role: string;
}

export interface MessRequest extends AuthRequest {
  mess?: MessContext;
}

/**
 * Ensures the mess cycle in `req.params[param]` exists AND the current user is an active
 * member of the home it belongs to. Without this, any signed-in user could read or edit
 * any other home's meals, bazaar, deposits and summary just by changing the ID in the URL.
 */
export const requireMessMember = (param = 'messId') =>
  async (req: MessRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const messId = parseParamId(req.params[param]);
      if (!messId) {
        res.status(400).json({ success: false, code: 'BAD_REQUEST', message: 'Invalid mess ID' });
        return;
      }
      const result = await query(
        `SELECT mc.id, mc.home_id, mc.start_date, mc.end_date, hm.role
         FROM mess_cycles mc
         JOIN home_members hm ON hm.home_id = mc.home_id AND hm.user_id = $2 AND hm.status = 'active'
         WHERE mc.id = $1`,
        [messId, req.user?.id]
      );
      if (result.rows.length === 0) {
        res.status(404).json({ success: false, code: 'MESS_NOT_FOUND', message: 'Mess not found' });
        return;
      }
      req.mess = result.rows[0];
      next();
    } catch (err) {
      next(err);
    }
  };

export const isActiveHomeMember = async (homeId: number, userId: number | undefined): Promise<boolean> => {
  if (!userId) return false;
  const result = await query(
    `SELECT 1 FROM home_members WHERE home_id = $1 AND user_id = $2 AND status = 'active'`,
    [homeId, userId]
  );
  return result.rows.length > 0;
};

export const isDateInMess = (mess: MessContext, date: string): boolean =>
  date >= mess.start_date && date <= mess.end_date;
