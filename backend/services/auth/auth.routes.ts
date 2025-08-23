import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { JWTService, DeviceInfo } from './jwt.service';
import { OAuthService } from './oauth.service';
import { authAttemptLimiter, resetAuthRateLimit } from '../../shared/middleware/rateLimiter';
import { authenticateToken, AuthenticatedRequest } from '../../shared/middleware/auth';
import { ValidationError } from '../../shared/utils/errors';

const router = Router();

// Validation schemas
const googleAuthSchema = z.object({
  idToken: z.string().min(1, 'Google ID token is required'),
  deviceInfo: z.object({
    userAgent: z.string().optional(),
    deviceId: z.string().optional()
  }).optional()
});

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
  deviceInfo: z.object({
    userAgent: z.string().optional(),
    deviceId: z.string().optional()
  }).optional()
});

// Validation middleware
const validateRequest = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const message = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        throw new ValidationError(message);
      }
      throw error;
    }
  };
};

// POST /auth/google - Authenticate with Google OAuth
router.post('/google', 
  authAttemptLimiter,
  validateRequest(googleAuthSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { idToken, deviceInfo } = req.body;
      const ipAddress = req.ip;

      const oauthService = new OAuthService();
      const jwtService = new JWTService();

      // Verify Google token
      const googleUserInfo = await oauthService.verifyGoogleToken(idToken);

      // Find or create user
      const { userId, email, isNewUser } = await oauthService.findOrCreateUser(googleUserInfo);

      // Update last seen
      await oauthService.updateUserLastSeen(userId);

      // Generate JWT tokens
      const deviceData: DeviceInfo = {
        userAgent: req.headers['user-agent'],
        ipAddress,
        deviceId: deviceInfo?.deviceId,
        ...deviceInfo
      };

      const tokens = await jwtService.generateTokenPair(userId, email, deviceData);

      // Reset rate limiting on successful auth
      await resetAuthRateLimit(ipAddress || '127.0.0.1', email);

      res.status(200).json({
        success: true,
        data: {
          user: {
            id: userId,
            email,
            isNewUser
          },
          tokens
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /auth/refresh - Refresh access token
router.post('/refresh',
  validateRequest(refreshTokenSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { refreshToken, deviceInfo } = req.body;

      const jwtService = new JWTService();

      const deviceData: DeviceInfo = {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
        deviceId: deviceInfo?.deviceId,
        ...deviceInfo
      };

      const tokens = await jwtService.refreshTokenPair(refreshToken, deviceData);

      res.status(200).json({
        success: true,
        data: { tokens }
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /auth/logout - Logout user (revoke refresh token)
router.post('/logout',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        throw new ValidationError('Refresh token is required');
      }

      const jwtService = new JWTService();
      await jwtService.revokeRefreshToken(refreshToken);

      res.status(200).json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /auth/logout-all - Logout from all devices
router.post('/logout-all',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;

      const jwtService = new JWTService();
      await jwtService.revokeAllUserTokens(userId);

      res.status(200).json({
        success: true,
        message: 'Logged out from all devices'
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /auth/me - Get current user info
router.get('/me',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;

      const oauthService = new OAuthService();
      const user = await oauthService.getUserById(userId);

      res.status(200).json({
        success: true,
        data: { user }
      });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /auth/account - Deactivate user account
router.delete('/account',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;

      const oauthService = new OAuthService();
      const jwtService = new JWTService();

      // Revoke all tokens
      await jwtService.revokeAllUserTokens(userId);

      // Deactivate account
      await oauthService.deactivateUser(userId);

      res.status(200).json({
        success: true,
        message: 'Account deactivated successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;