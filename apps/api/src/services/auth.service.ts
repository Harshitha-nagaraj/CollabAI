import { prisma } from '../lib/prisma.js';
import { RegisterInput, LoginInput } from '../validators/auth.validator.js';
import { hashPassword, comparePassword } from '../utils/bcrypt.js';
import { generateToken } from '../utils/jwt.js';
import { ConflictError, UnauthorizedError, NotFoundError } from '../utils/errors.js';
import { User } from '@prisma/client';

export type UserWithoutPassword = Omit<User, 'password'>;

export interface AuthResult {
  user: UserWithoutPassword;
  token: string;
}

export class AuthService {
  /**
   * Registers a new user with name, email, and password.
   */
  public static async registerUser(input: RegisterInput): Promise<AuthResult> {
    const emailNormalized = input.email.toLowerCase().trim();

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: emailNormalized },
    });

    if (existingUser) {
      throw new ConflictError('Email already registered');
    }

    // Hash password
    const hashedPassword = await hashPassword(input.password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: emailNormalized,
        name: input.name,
        password: hashedPassword,
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Generate access token for immediate session hydration
    const token = generateToken({ userId: user.id });

    return {
      user,
      token,
    };
  }

  /**
   * Logs in a user, returns user profile and JWT access token.
   */
  public static async loginUser(input: LoginInput): Promise<AuthResult> {
    const emailNormalized = input.email.toLowerCase().trim();

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: emailNormalized },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Compare passwords
    const isPasswordValid = await comparePassword(input.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Generate token
    const token = generateToken({ userId: user.id });

    // Remove password hash from returned object
    const { password, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      token,
    };
  }

  /**
   * Retrieves profile of a user by ID.
   */
  public static async getCurrentUser(userId: string): Promise<UserWithoutPassword> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return user;
  }
}
