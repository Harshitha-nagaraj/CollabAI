import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

/**
 * Hashes a plaintext password using bcrypt.
 * @param password Plaintext password to hash
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compares a plaintext password with a hashed password.
 * @param password Plaintext password
 * @param hash BCRYPT hashed password
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
