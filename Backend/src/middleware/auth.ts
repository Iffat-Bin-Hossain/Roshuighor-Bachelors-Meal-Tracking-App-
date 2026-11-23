import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/env.js';
import { query } from '../config/db.js';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    name: string;
  };
}

export const signToken = (user: { id: number; email: string; name: string }): string =>
  jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '30d' });

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ success: false, code: 'AUTH_REQUIRED', message: 'Authentication required' });
    return;
  }

  let decoded: jwt.JwtPayload & { id: number; email: string; name: string };
  try {
    decoded = jwt.verify(token, JWT_SECRET) as typeof decoded;
  } catch {
    res.status(401).json({ success: false, code: 'SESSION_EXPIRED', message: 'Invalid or expired token' });
    return;
  }

  try {
    // Reject tokens for deleted users, or tokens issued before the last password change
    const result = await query('SELECT password_changed_at FROM users WHERE id = $1', [decoded.id]);
    if (result.rows.length === 0) {
      res.status(401).json({ success: false, code: 'SESSION_EXPIRED', message: 'Account not found' });
      return;
    }
    const changedAt: Date | null = result.rows[0].password_changed_at;
    // password_changed_at is stored truncated to whole seconds, matching JWT `iat` precision
    if (changedAt && decoded.iat && decoded.iat < Math.floor(changedAt.getTime() / 1000)) {
      res.status(401).json({ success: false, code: 'SESSION_EXPIRED', message: 'Session expired. Please sign in again.' });
      return;
    }
  } catch (err) {
    next(err);
    return;
  }

  req.user = { id: decoded.id, email: decoded.email, name: decoded.name };
  next();
};
