import { Request, Response, NextFunction } from 'express';

/**
 * Minimal in-memory fixed-window rate limiter (per IP + route).
 * Good enough for a single backend instance; swap for Redis if you scale horizontally.
 */
export const rateLimit = (opts: { windowMs: number; max: number }) => {
  const hits = new Map<string, { count: number; resetAt: number }>();

  setInterval(() => {
    const now = Date.now();
    for (const [key, v] of hits) if (v.resetAt <= now) hits.delete(key);
  }, opts.windowMs).unref();

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = `${req.ip}:${req.baseUrl}${req.path}`;
    const now = Date.now();
    const entry = hits.get(key);

    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + opts.windowMs });
      next();
      return;
    }

    entry.count += 1;
    if (entry.count > opts.max) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.setHeader('Retry-After', String(retryAfter));
      res.status(429).json({
        success: false,
        code: 'RATE_LIMITED',
        retryAfter,
        message: 'Too many requests. Please try again later.'
      });
      return;
    }
    next();
  };
};
