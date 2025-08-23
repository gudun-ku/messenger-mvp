import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';
import { query } from '../database/connection';
import { RateLimitError } from '../utils/errors';

export const createRateLimiter = (options: {
  windowMs: number;
  max: number;
  message?: string;
}) => {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    standardHeaders: true,
    legacyHeaders: false,
    message: options.message || 'Too many requests',
    handler: (req: Request, res: Response) => {
      throw new RateLimitError(options.message || 'Too many requests');
    }
  });
};

// Standard rate limiters
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: 'Too many authentication attempts'
});

export const apiRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many API requests'
});

// Database-based rate limiter for authentication attempts
export const authAttemptLimiter = async (
  req: Request, 
  res: Response, 
  next: NextFunction
) => {
  try {
    const ipAddress = req.ip;
    const email = req.body.email;
    const windowMs = 15 * 60 * 1000; // 15 minutes
    const maxAttempts = 5;

    // Check rate limits for IP
    await checkAndUpdateRateLimit(ipAddress || '127.0.0.1', null, windowMs, maxAttempts);
    
    // If email provided, also check rate limits for email
    if (email) {
      await checkAndUpdateRateLimit(ipAddress || '127.0.0.1', email, windowMs, maxAttempts);
    }

    next();
  } catch (error) {
    next(error);
  }
};

async function checkAndUpdateRateLimit(
  ipAddress: string,
  email: string | null,
  windowMs: number,
  maxAttempts: number
): Promise<void> {
  const windowStart = new Date(Date.now() - windowMs);
  
  // Find existing rate limit record
  const result = await query(`
    SELECT id, attempt_count, blocked_until, window_start
    FROM auth_rate_limits
    WHERE ip_address = $1 AND ($2::text IS NULL OR email = $2) AND window_start > $3
    ORDER BY window_start DESC
    LIMIT 1
  `, [ipAddress, email, windowStart]);

  if (result.rows.length > 0) {
    const record = result.rows[0];
    
    // Check if currently blocked
    if (record.blocked_until && new Date() < new Date(record.blocked_until)) {
      const blockedUntil = new Date(record.blocked_until);
      const remainingTime = Math.ceil((blockedUntil.getTime() - Date.now()) / 1000 / 60);
      throw new RateLimitError(`Too many attempts. Try again in ${remainingTime} minutes`);
    }

    // Check if within rate limit
    if (record.attempt_count >= maxAttempts) {
      const blockedUntil = new Date(Date.now() + windowMs);
      
      // Update record to set blocked_until
      await query(`
        UPDATE auth_rate_limits 
        SET attempt_count = attempt_count + 1, blocked_until = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [blockedUntil, record.id]);
      
      throw new RateLimitError('Too many attempts. Try again later');
    }

    // Increment attempt count
    await query(`
      UPDATE auth_rate_limits 
      SET attempt_count = attempt_count + 1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [record.id]);
  } else {
    // Create new rate limit record
    await query(`
      INSERT INTO auth_rate_limits (ip_address, email, attempt_count, window_start)
      VALUES ($1, $2, 1, CURRENT_TIMESTAMP)
    `, [ipAddress, email]);
  }
}

// Reset rate limit on successful authentication
export const resetAuthRateLimit = async (ipAddress: string, email?: string): Promise<void> => {
  await query(`
    DELETE FROM auth_rate_limits 
    WHERE ip_address = $1 AND ($2::text IS NULL OR email = $2)
  `, [ipAddress, email]);
};

// Cleanup expired rate limit records (should be run periodically)
export const cleanupRateLimits = async (): Promise<number> => {
  const result = await query(`
    DELETE FROM auth_rate_limits 
    WHERE window_start < NOW() - INTERVAL '1 hour'
      AND (blocked_until IS NULL OR blocked_until < NOW())
  `);
  
  return result.rowCount || 0;
};