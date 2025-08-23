import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { query, transaction, hashToken } from '../../shared/database/connection';
import { AuthenticationError } from '../../shared/utils/errors';

export interface JWTPayload {
  userId: string;
  email: string;
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface DeviceInfo {
  userAgent?: string;
  ipAddress?: string;
  deviceId?: string;
}

export class JWTService {
  private readonly accessTokenSecret: string;
  private readonly refreshTokenSecret: string;
  private readonly accessTokenExpiry: string;
  private readonly refreshTokenExpiry: string;

  constructor() {
    this.accessTokenSecret = process.env.JWT_ACCESS_SECRET!;
    this.refreshTokenSecret = process.env.JWT_REFRESH_SECRET!;
    this.accessTokenExpiry = process.env.JWT_ACCESS_EXPIRY || '15m';
    this.refreshTokenExpiry = process.env.JWT_REFRESH_EXPIRY || '7d';

    if (!this.accessTokenSecret || !this.refreshTokenSecret) {
      throw new Error('JWT secrets must be provided in environment variables');
    }
  }

  async generateTokenPair(userId: string, email: string, deviceInfo?: DeviceInfo): Promise<TokenPair> {
    const accessToken = this.generateAccessToken(userId, email);
    const refreshToken = this.generateRefreshToken();
    
    const expiresIn = this.getExpiryInSeconds(this.accessTokenExpiry);
    const refreshExpiresAt = new Date(Date.now() + this.getExpiryInSeconds(this.refreshTokenExpiry) * 1000);

    // Store refresh token in database
    await this.storeRefreshToken(userId, refreshToken, refreshExpiresAt, deviceInfo);

    return {
      accessToken,
      refreshToken,
      expiresIn
    };
  }

  private generateAccessToken(userId: string, email: string): string {
    const payload: JWTPayload = {
      userId,
      email,
      type: 'access'
    };

    const signOptions: SignOptions = {
      expiresIn: this.accessTokenExpiry as any,
      issuer: 'messenger-mvp',
      audience: 'messenger-users'
    };
    
    return jwt.sign(payload, this.accessTokenSecret, signOptions);
  }

  private generateRefreshToken(): string {
    return crypto.randomBytes(64).toString('hex');
  }

  async verifyAccessToken(token: string): Promise<JWTPayload> {
    try {
      const decoded = jwt.verify(token, this.accessTokenSecret) as JWTPayload;
      
      if (decoded.type !== 'access') {
        throw new AuthenticationError('Invalid token type');
      }

      return decoded;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new AuthenticationError('Invalid access token');
      }
      if (error instanceof jwt.TokenExpiredError) {
        throw new AuthenticationError('Access token expired');
      }
      throw error;
    }
  }

  async refreshTokenPair(refreshToken: string, deviceInfo?: DeviceInfo): Promise<TokenPair> {
    return transaction(async (client) => {
      const tokenHash = hashToken(refreshToken);
      
      // Find and validate refresh token
      const result = await client.query(`
        SELECT rt.user_id, rt.expires_at, u.email 
        FROM refresh_tokens rt
        JOIN users u ON rt.user_id = u.id
        WHERE rt.token_hash = $1 AND rt.is_revoked = false AND rt.expires_at > NOW()
      `, [tokenHash]);

      if (result.rows.length === 0) {
        throw new AuthenticationError('Invalid or expired refresh token');
      }

      const { user_id: userId, email } = result.rows[0];

      // Revoke the old refresh token
      await client.query(`
        UPDATE refresh_tokens 
        SET is_revoked = true 
        WHERE token_hash = $1
      `, [tokenHash]);

      // Generate new token pair
      const newAccessToken = this.generateAccessToken(userId, email);
      const newRefreshToken = this.generateRefreshToken();
      
      const expiresIn = this.getExpiryInSeconds(this.accessTokenExpiry);
      const refreshExpiresAt = new Date(Date.now() + this.getExpiryInSeconds(this.refreshTokenExpiry) * 1000);

      // Store new refresh token
      await this.storeRefreshTokenWithClient(client, userId, newRefreshToken, refreshExpiresAt, deviceInfo);

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresIn
      };
    });
  }

  async revokeRefreshToken(refreshToken: string): Promise<void> {
    const tokenHash = hashToken(refreshToken);
    
    await query(`
      UPDATE refresh_tokens 
      SET is_revoked = true 
      WHERE token_hash = $1
    `, [tokenHash]);
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    await query(`
      UPDATE refresh_tokens 
      SET is_revoked = true 
      WHERE user_id = $1 AND is_revoked = false
    `, [userId]);
  }

  private async storeRefreshToken(
    userId: string, 
    refreshToken: string, 
    expiresAt: Date, 
    deviceInfo?: DeviceInfo
  ): Promise<void> {
    const tokenHash = hashToken(refreshToken);
    
    await query(`
      INSERT INTO refresh_tokens (user_id, token_hash, expires_at, device_info)
      VALUES ($1, $2, $3, $4)
    `, [userId, tokenHash, expiresAt, deviceInfo ? JSON.stringify(deviceInfo) : null]);
  }

  private async storeRefreshTokenWithClient(
    client: any,
    userId: string, 
    refreshToken: string, 
    expiresAt: Date, 
    deviceInfo?: DeviceInfo
  ): Promise<void> {
    const tokenHash = hashToken(refreshToken);
    
    await client.query(`
      INSERT INTO refresh_tokens (user_id, token_hash, expires_at, device_info)
      VALUES ($1, $2, $3, $4)
    `, [userId, tokenHash, expiresAt, deviceInfo ? JSON.stringify(deviceInfo) : null]);
  }

  private getExpiryInSeconds(expiry: string): number {
    const unit = expiry.slice(-1);
    const value = parseInt(expiry.slice(0, -1));
    
    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 3600;
      case 'd': return value * 86400;
      default: return 900; // 15 minutes default
    }
  }

  // Cleanup expired tokens (should be run periodically)
  async cleanupExpiredTokens(): Promise<number> {
    const result = await query(`
      DELETE FROM refresh_tokens 
      WHERE expires_at < NOW() OR is_revoked = true
    `);
    
    return result.rowCount || 0;
  }
}