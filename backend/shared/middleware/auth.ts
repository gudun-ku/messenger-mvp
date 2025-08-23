import { Request, Response, NextFunction } from 'express';
import { JWTService } from '../../services/auth/jwt.service';
import { AuthenticationError } from '../utils/errors';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
  };
}

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      throw new AuthenticationError('Access token required');
    }

    const jwtService = new JWTService();
    const payload = await jwtService.verifyAccessToken(token);

    req.user = {
      userId: payload.userId,
      email: payload.email
    };

    next();
  } catch (error) {
    next(error);
  }
};

export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const jwtService = new JWTService();
      const payload = await jwtService.verifyAccessToken(token);

      req.user = {
        userId: payload.userId,
        email: payload.email
      };
    }

    next();
  } catch (error) {
    // For optional auth, continue without setting user
    next();
  }
};