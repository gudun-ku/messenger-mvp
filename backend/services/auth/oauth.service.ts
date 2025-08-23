import { OAuth2Client } from 'google-auth-library';
import { query, transaction } from '../../shared/database/connection';
import { AuthenticationError, ValidationError } from '../../shared/utils/errors';

export interface GoogleUserInfo {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  picture: string;
  locale?: string;
}

export interface CreateUserData {
  email: string;
  displayName: string;
  profilePictureUrl?: string;
  googleId: string;
  emailVerified: boolean;
}

export class OAuthService {
  private readonly googleClient: OAuth2Client;

  constructor() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('Google OAuth credentials must be provided in environment variables');
    }

    this.googleClient = new OAuth2Client(clientId, clientSecret);
  }

  async verifyGoogleToken(idToken: string): Promise<GoogleUserInfo> {
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID
      });

      const payload = ticket.getPayload();
      
      if (!payload) {
        throw new AuthenticationError('Invalid Google token payload');
      }

      if (!payload.email || !payload.sub) {
        throw new ValidationError('Google token missing required fields');
      }

      return {
        id: payload.sub,
        email: payload.email,
        verified_email: payload.email_verified ?? false,
        name: payload.name || '',
        picture: payload.picture || '',
        locale: payload.locale
      };
    } catch (error) {
      if (error instanceof AuthenticationError || error instanceof ValidationError) {
        throw error;
      }
      throw new AuthenticationError('Failed to verify Google token');
    }
  }

  async findOrCreateUser(googleUserInfo: GoogleUserInfo): Promise<{ userId: string; email: string; isNewUser: boolean }> {
    return transaction(async (client) => {
      // First, try to find user by Google ID
      let result = await client.query(
        'SELECT id, email FROM users WHERE google_id = $1 AND is_active = true',
        [googleUserInfo.id]
      );

      if (result.rows.length > 0) {
        const user = result.rows[0];
        return {
          userId: user.id,
          email: user.email,
          isNewUser: false
        };
      }

      // If not found by Google ID, try to find by email
      result = await client.query(
        'SELECT id, email, google_id FROM users WHERE email = $1 AND is_active = true',
        [googleUserInfo.email]
      );

      if (result.rows.length > 0) {
        const user = result.rows[0];
        
        // If user exists with this email but no Google ID, link the account
        if (!user.google_id) {
          await client.query(
            `UPDATE users 
             SET google_id = $1, email_verified = $2, profile_picture_url = $3, updated_at = CURRENT_TIMESTAMP
             WHERE id = $4`,
            [googleUserInfo.id, googleUserInfo.verified_email, googleUserInfo.picture, user.id]
          );

          return {
            userId: user.id,
            email: user.email,
            isNewUser: false
          };
        }

        // User exists with different Google ID - this is a conflict
        throw new ValidationError('Email already associated with different Google account');
      }

      // Create new user
      const userData: CreateUserData = {
        email: googleUserInfo.email,
        displayName: googleUserInfo.name,
        profilePictureUrl: googleUserInfo.picture,
        googleId: googleUserInfo.id,
        emailVerified: googleUserInfo.verified_email
      };

      const newUser = await this.createUser(client, userData);
      
      return {
        userId: newUser.id,
        email: newUser.email,
        isNewUser: true
      };
    });
  }

  private async createUser(client: any, userData: CreateUserData): Promise<{ id: string; email: string }> {
    const result = await client.query(
      `INSERT INTO users (email, display_name, profile_picture_url, google_id, email_verified, is_active)
       VALUES ($1, $2, $3, $4, $5, true)
       RETURNING id, email`,
      [
        userData.email,
        userData.displayName,
        userData.profilePictureUrl,
        userData.googleId,
        userData.emailVerified
      ]
    );

    if (result.rows.length === 0) {
      throw new Error('Failed to create user');
    }

    return result.rows[0];
  }

  async updateUserLastSeen(userId: string): Promise<void> {
    await query(
      'UPDATE users SET last_seen_at = CURRENT_TIMESTAMP WHERE id = $1',
      [userId]
    );
  }

  async getUserById(userId: string): Promise<any> {
    const result = await query(
      `SELECT id, email, username, display_name, profile_picture_url, 
              email_verified, last_seen_at, created_at
       FROM users 
       WHERE id = $1 AND is_active = true`,
      [userId]
    );

    if (result.rows.length === 0) {
      throw new AuthenticationError('User not found');
    }

    return result.rows[0];
  }

  async deactivateUser(userId: string): Promise<void> {
    await query(
      'UPDATE users SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [userId]
    );
  }
}