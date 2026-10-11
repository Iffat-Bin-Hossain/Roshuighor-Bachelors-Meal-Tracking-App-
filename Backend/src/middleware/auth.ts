import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    name: string;
  };
}

export const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ success: false, message: 'Authentication required' });
    return;
  }

  const secret = process.env.JWT_SECRET || 'rosuighor_secret_default_key';

  jwt.verify(token, secret, (err, decodedUser) => {
    if (err || !decodedUser) {
      res.status(403).json({ success: false, message: 'Invalid or expired token' });
      return;
    }
    req.user = decodedUser as { id: number; email: string; name: string };
    next();
  });
};
