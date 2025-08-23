import { Request, Response, NextFunction } from 'express';
import { logApiRequest } from '../utils/logger';
import { AuthenticatedRequest } from './auth';

export const requestLogger = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  // Override res.end to capture response details
  const originalEnd = res.end;
  
  // Use any to avoid complex TypeScript overloading issues
  (res as any).end = function(...args: any[]) {
    const duration = Date.now() - startTime;
    
    logApiRequest({
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration,
      userId: req.user?.userId,
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent']
    });

    // Call original method with all arguments
    return (originalEnd as any).apply(this, args);
  };

  next();
};