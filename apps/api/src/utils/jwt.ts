import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { UnauthorizedError } from './errors.js';

interface TokenPayload {
  userId: string;
}

/**
 * Generates an Access Token for a user.
 * Expires in 24 hours.
 */
export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: '24h' });
}

/**
 * Verifies and decodes an Access Token.
 * Throws UnauthorizedError if invalid or expired.
 */
export function verifyToken(token: string): TokenPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as TokenPayload;
    if (!decoded || !decoded.userId) {
      throw new UnauthorizedError('Invalid token payload');
    }
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Token has expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new UnauthorizedError('Invalid access token');
    }
    throw error;
  }
}
