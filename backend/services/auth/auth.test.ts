import request from 'supertest';
import express from 'express';
import { JWTService } from './jwt.service';
import { OAuthService } from './oauth.service';
import authRoutes from './auth.routes';
import { errorHandler } from '../../shared/middleware/errorHandler';
import { requestLogger } from '../../shared/middleware/logging';

// Mock dependencies
jest.mock('./jwt.service');
jest.mock('./oauth.service');
jest.mock('../../shared/middleware/rateLimiter', () => ({
  authAttemptLimiter: (req: any, res: any, next: any) => next(),
  resetAuthRateLimit: jest.fn()
}));

const MockedJWTService = JWTService as jest.MockedClass<typeof JWTService>;
const MockedOAuthService = OAuthService as jest.MockedClass<typeof OAuthService>;

describe('Auth Routes', () => {
  let app: express.Application;
  let mockJWTService: jest.Mocked<JWTService>;
  let mockOAuthService: jest.Mocked<OAuthService>;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(requestLogger);
    app.use('/auth', authRoutes);
    app.use(errorHandler);

    // Reset mocks
    jest.clearAllMocks();

    // Create mock instances
    mockJWTService = {
      generateTokenPair: jest.fn(),
      verifyAccessToken: jest.fn(),
      refreshTokenPair: jest.fn(),
      revokeRefreshToken: jest.fn(),
      revokeAllUserTokens: jest.fn(),
      cleanupExpiredTokens: jest.fn()
    } as any;

    mockOAuthService = {
      verifyGoogleToken: jest.fn(),
      findOrCreateUser: jest.fn(),
      updateUserLastSeen: jest.fn(),
      getUserById: jest.fn(),
      deactivateUser: jest.fn()
    } as any;

    // Mock constructor returns
    MockedJWTService.mockImplementation(() => mockJWTService);
    MockedOAuthService.mockImplementation(() => mockOAuthService);
  });

  describe('POST /auth/google', () => {
    const validGoogleAuthRequest = {
      idToken: 'valid.google.token',
      deviceInfo: {
        userAgent: 'Test Agent',
        deviceId: 'test-device-123'
      }
    };

    it('should authenticate user with valid Google token', async () => {
      // Arrange
      const googleUserInfo = {
        id: 'google123',
        email: 'test@example.com',
        verified_email: true,
        name: 'Test User',
        picture: 'https://example.com/photo.jpg'
      };

      const userResult = {
        userId: 'user123',
        email: 'test@example.com',
        isNewUser: false
      };

      const tokens = {
        accessToken: 'access.token',
        refreshToken: 'refresh.token',
        expiresIn: 900
      };

      mockOAuthService.verifyGoogleToken.mockResolvedValue(googleUserInfo);
      mockOAuthService.findOrCreateUser.mockResolvedValue(userResult);
      mockOAuthService.updateUserLastSeen.mockResolvedValue();
      mockJWTService.generateTokenPair.mockResolvedValue(tokens);

      // Act
      const response = await request(app)
        .post('/auth/google')
        .send(validGoogleAuthRequest);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: {
          user: {
            id: userResult.userId,
            email: userResult.email,
            isNewUser: userResult.isNewUser
          },
          tokens
        }
      });

      expect(mockOAuthService.verifyGoogleToken).toHaveBeenCalledWith(validGoogleAuthRequest.idToken);
      expect(mockOAuthService.findOrCreateUser).toHaveBeenCalledWith(googleUserInfo);
      expect(mockOAuthService.updateUserLastSeen).toHaveBeenCalledWith(userResult.userId);
      expect(mockJWTService.generateTokenPair).toHaveBeenCalledWith(
        userResult.userId,
        userResult.email,
        expect.objectContaining({
          deviceId: validGoogleAuthRequest.deviceInfo.deviceId
        })
      );
    });

    it('should return 400 for invalid request body', async () => {
      const response = await request(app)
        .post('/auth/google')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Required');
    });

    it('should return 401 for invalid Google token', async () => {
      mockOAuthService.verifyGoogleToken.mockRejectedValue(
        new Error('Invalid Google token')
      );

      const response = await request(app)
        .post('/auth/google')
        .send(validGoogleAuthRequest);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /auth/refresh', () => {
    const validRefreshRequest = {
      refreshToken: 'valid.refresh.token',
      deviceInfo: {
        deviceId: 'test-device-123'
      }
    };

    it('should refresh tokens with valid refresh token', async () => {
      const newTokens = {
        accessToken: 'new.access.token',
        refreshToken: 'new.refresh.token',
        expiresIn: 900
      };

      mockJWTService.refreshTokenPair.mockResolvedValue(newTokens);

      const response = await request(app)
        .post('/auth/refresh')
        .send(validRefreshRequest);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: { tokens: newTokens }
      });

      expect(mockJWTService.refreshTokenPair).toHaveBeenCalledWith(
        validRefreshRequest.refreshToken,
        expect.objectContaining({
          deviceId: validRefreshRequest.deviceInfo.deviceId
        })
      );
    });

    it('should return 400 for missing refresh token', async () => {
      const response = await request(app)
        .post('/auth/refresh')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Required');
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout user with valid refresh token', async () => {
      const mockPayload = {
        userId: 'user123',
        email: 'test@example.com',
        type: 'access' as const
      };

      mockJWTService.verifyAccessToken.mockResolvedValue(mockPayload);
      mockJWTService.revokeRefreshToken.mockResolvedValue();

      const response = await request(app)
        .post('/auth/logout')
        .set('Authorization', 'Bearer valid.access.token')
        .send({ refreshToken: 'refresh.token' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'Logged out successfully'
      });

      expect(mockJWTService.revokeRefreshToken).toHaveBeenCalledWith('refresh.token');
    });

    it('should return 401 without authorization header', async () => {
      const response = await request(app)
        .post('/auth/logout')
        .send({ refreshToken: 'refresh.token' });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /auth/logout-all', () => {
    it('should logout user from all devices', async () => {
      const mockPayload = {
        userId: 'user123',
        email: 'test@example.com',
        type: 'access' as const
      };

      mockJWTService.verifyAccessToken.mockResolvedValue(mockPayload);
      mockJWTService.revokeAllUserTokens.mockResolvedValue();

      const response = await request(app)
        .post('/auth/logout-all')
        .set('Authorization', 'Bearer valid.access.token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'Logged out from all devices'
      });

      expect(mockJWTService.revokeAllUserTokens).toHaveBeenCalledWith('user123');
    });
  });

  describe('GET /auth/me', () => {
    it('should return user info for authenticated user', async () => {
      const mockPayload = {
        userId: 'user123',
        email: 'test@example.com',
        type: 'access' as const
      };

      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        display_name: 'Test User',
        created_at: '2025-08-23T19:43:34.724Z'
      };

      mockJWTService.verifyAccessToken.mockResolvedValue(mockPayload);
      mockOAuthService.getUserById.mockResolvedValue(mockUser);

      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', 'Bearer valid.access.token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: { user: mockUser }
      });

      expect(mockOAuthService.getUserById).toHaveBeenCalledWith('user123');
    });
  });

  describe('DELETE /auth/account', () => {
    it('should deactivate user account', async () => {
      const mockPayload = {
        userId: 'user123',
        email: 'test@example.com',
        type: 'access' as const
      };

      mockJWTService.verifyAccessToken.mockResolvedValue(mockPayload);
      mockJWTService.revokeAllUserTokens.mockResolvedValue();
      mockOAuthService.deactivateUser.mockResolvedValue();

      const response = await request(app)
        .delete('/auth/account')
        .set('Authorization', 'Bearer valid.access.token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'Account deactivated successfully'
      });

      expect(mockJWTService.revokeAllUserTokens).toHaveBeenCalledWith('user123');
      expect(mockOAuthService.deactivateUser).toHaveBeenCalledWith('user123');
    });
  });
});