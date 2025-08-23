import { JWTService } from './jwt.service';
import jwt from 'jsonwebtoken';
import { AuthenticationError } from '../../shared/utils/errors';

// Mock dependencies
jest.mock('../../shared/database/connection', () => ({
  query: jest.fn(),
  transaction: jest.fn(),
  hashToken: jest.fn((token: string) => `hashed_${token}`)
}));

const mockQuery = require('../../shared/database/connection').query;
const mockTransaction = require('../../shared/database/connection').transaction;

describe('JWTService', () => {
  let jwtService: JWTService;

  beforeEach(() => {
    // Set required environment variables
    process.env.JWT_ACCESS_SECRET = 'test-access-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
    process.env.JWT_ACCESS_EXPIRY = '15m';
    process.env.JWT_REFRESH_EXPIRY = '7d';

    jwtService = new JWTService();
    jest.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.JWT_ACCESS_SECRET;
    delete process.env.JWT_REFRESH_SECRET;
    delete process.env.JWT_ACCESS_EXPIRY;
    delete process.env.JWT_REFRESH_EXPIRY;
  });

  describe('constructor', () => {
    it('should throw error if JWT secrets are not provided', () => {
      delete process.env.JWT_ACCESS_SECRET;
      
      expect(() => new JWTService()).toThrow('JWT secrets must be provided in environment variables');
    });
  });

  describe('generateTokenPair', () => {
    it('should generate access and refresh tokens', async () => {
      const userId = 'user123';
      const email = 'test@example.com';
      const deviceInfo = { deviceId: 'device123' };

      mockQuery.mockResolvedValue({ rows: [], rowCount: 1 });

      const result = await jwtService.generateTokenPair(userId, email, deviceInfo);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('expiresIn');
      expect(typeof result.accessToken).toBe('string');
      expect(typeof result.refreshToken).toBe('string');
      expect(typeof result.expiresIn).toBe('number');

      // Verify access token payload
      const decoded = jwt.verify(result.accessToken, process.env.JWT_ACCESS_SECRET!) as any;
      expect(decoded.userId).toBe(userId);
      expect(decoded.email).toBe(email);
      expect(decoded.type).toBe('access');

      // Verify refresh token is stored in database
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO refresh_tokens'),
        expect.arrayContaining([userId, expect.any(String), expect.any(Date), JSON.stringify(deviceInfo)])
      );
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify valid access token', async () => {
      const userId = 'user123';
      const email = 'test@example.com';
      
      const token = jwt.sign(
        { userId, email, type: 'access' },
        process.env.JWT_ACCESS_SECRET!,
        { expiresIn: '15m' }
      );

      const result = await jwtService.verifyAccessToken(token);

      expect(result.userId).toBe(userId);
      expect(result.email).toBe(email);
      expect(result.type).toBe('access');
    });

    it('should throw AuthenticationError for invalid token', async () => {
      const invalidToken = 'invalid.token';

      await expect(jwtService.verifyAccessToken(invalidToken)).rejects.toThrow(AuthenticationError);
    });

    it('should throw AuthenticationError for expired token', async () => {
      const expiredToken = jwt.sign(
        { userId: 'user123', email: 'test@example.com', type: 'access' },
        process.env.JWT_ACCESS_SECRET!,
        { expiresIn: '-1s' } // Already expired
      );

      await expect(jwtService.verifyAccessToken(expiredToken)).rejects.toThrow(AuthenticationError);
    });

    it('should throw AuthenticationError for wrong token type', async () => {
      const wrongTypeToken = jwt.sign(
        { userId: 'user123', email: 'test@example.com', type: 'refresh' },
        process.env.JWT_ACCESS_SECRET!,
        { expiresIn: '15m' }
      );

      await expect(jwtService.verifyAccessToken(wrongTypeToken)).rejects.toThrow(AuthenticationError);
    });
  });

  describe('refreshTokenPair', () => {
    it('should refresh tokens with valid refresh token', async () => {
      const refreshToken = 'valid-refresh-token';
      const userId = 'user123';
      const email = 'test@example.com';

      // Mock transaction
      mockTransaction.mockImplementation(async (callback: any) => {
        const mockClient = {
          query: jest.fn()
            .mockResolvedValueOnce({
              rows: [{ user_id: userId, email, expires_at: new Date(Date.now() + 86400000) }]
            })
            .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // Revoke old token
            .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // Store new token
        };
        return callback(mockClient);
      });

      const result = await jwtService.refreshTokenPair(refreshToken);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('expiresIn');
      expect(result.refreshToken).not.toBe(refreshToken); // Should be a new token
    });

    it('should throw AuthenticationError for invalid refresh token', async () => {
      const invalidRefreshToken = 'invalid-refresh-token';

      mockTransaction.mockImplementation(async (callback: any) => {
        const mockClient = {
          query: jest.fn().mockResolvedValue({ rows: [] }) // No matching token
        };
        return callback(mockClient);
      });

      await expect(jwtService.refreshTokenPair(invalidRefreshToken)).rejects.toThrow(AuthenticationError);
    });
  });

  describe('revokeRefreshToken', () => {
    it('should revoke refresh token', async () => {
      const refreshToken = 'refresh-token-to-revoke';
      
      mockQuery.mockResolvedValue({ rows: [], rowCount: 1 });

      await jwtService.revokeRefreshToken(refreshToken);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE refresh_tokens SET is_revoked = true'),
        [expect.stringContaining('hashed_')]
      );
    });
  });

  describe('revokeAllUserTokens', () => {
    it('should revoke all user tokens', async () => {
      const userId = 'user123';
      
      mockQuery.mockResolvedValue({ rows: [], rowCount: 2 });

      await jwtService.revokeAllUserTokens(userId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE refresh_tokens SET is_revoked = true WHERE user_id = $1'),
        [userId]
      );
    });
  });

  describe('cleanupExpiredTokens', () => {
    it('should cleanup expired tokens and return count', async () => {
      const deletedCount = 5;
      mockQuery.mockResolvedValue({ rowCount: deletedCount });

      const result = await jwtService.cleanupExpiredTokens();

      expect(result).toBe(deletedCount);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM refresh_tokens WHERE expires_at < NOW() OR is_revoked = true')
      );
    });
  });
});