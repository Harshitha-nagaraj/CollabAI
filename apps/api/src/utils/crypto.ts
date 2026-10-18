/**
 * @file utils/crypto.ts
 *
 * Cryptographic helpers for enterprise integration credentials.
 * Provides AES-256-GCM encryption at rest for OAuth access and refresh tokens,
 * and signed, tamper-proof state tokens for CSRF protection.
 */

import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { UnauthorizedError } from './errors.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV recommended for GCM

/**
 * Derive a 256-bit (32-byte) key from the configured encryption secret or JWT_SECRET.
 */
function getEncryptionKey(): Buffer {
  const secret = env.INTEGRATION_ENCRYPTION_KEY || env.JWT_SECRET;
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encrypt a sensitive token using AES-256-GCM authenticated encryption.
 * Output format: iv:authTag:encryptedCiphertext (hex encoded)
 */
export function encryptToken(plainText: string): string {
  if (!plainText) return '';
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt an AES-256-GCM encrypted token.
 * Validates integrity via the GCM authentication tag.
 */
export function decryptToken(cipherText: string): string {
  if (!cipherText) return '';
  const parts = cipherText.split(':');
  if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) {
    throw new Error('Invalid encrypted token format');
  }

  const [ivHex, authTagHex, encryptedHex] = parts;
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, 'hex')),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}

/**
 * Generate a cryptographically secure random nonce.
 */
export function generateSecureNonce(bytes = 24): string {
  return crypto.randomBytes(bytes).toString('hex');
}

export interface OAuthStatePayload {
  workspaceId: string;
  userId: string;
  provider: string;
  nonce: string;
  returnTo?: string;
}

/**
 * Create a signed, tamper-proof state token for OAuth CSRF protection.
 * Expires in 15 minutes.
 */
export function createOAuthState(payload: OAuthStatePayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: '15m',
    issuer: 'collabai',
  });
}

/**
 * Verify and decode an OAuth state token.
 * Throws UnauthorizedError if invalid, tampered with, or expired.
 */
export function verifyOAuthState(stateToken: string): OAuthStatePayload {
  try {
    const decoded = jwt.verify(stateToken, env.JWT_SECRET, {
      issuer: 'collabai',
    }) as OAuthStatePayload;

    if (!decoded || !decoded.workspaceId || !decoded.userId || !decoded.nonce) {
      throw new UnauthorizedError('Malformed OAuth state parameter');
    }

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('OAuth state has expired. Please initiate connection again.');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new UnauthorizedError('Invalid or forged OAuth state token.');
    }
    throw error;
  }
}
