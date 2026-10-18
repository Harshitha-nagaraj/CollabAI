import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt.js';
import { prisma } from '../lib/prisma.js';
import { UnauthorizedError } from '../utils/errors.js';
import { env } from '../config/env.js';

/**
 * Middleware to protect private routes.
 * Validates JWT access token and populates req.user.
 */
export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Authentication token required');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new UnauthorizedError('Authentication token required');
    }

    if (token === 'demo-token') {
      if (env.ALLOW_DEMO_AUTH && env.NODE_ENV !== 'production') {
        const demoUserId = '00000000-0000-0000-0000-000000000001';
        let demoUser = await prisma.user.findUnique({
          where: { id: demoUserId },
          select: {
            id: true,
            email: true,
            name: true,
            avatarUrl: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        if (!demoUser) {
          demoUser = await prisma.user.upsert({
            where: { id: demoUserId },
            update: {},
            create: {
              id: demoUserId,
              email: 'harshitha@collabai.internal',
              name: 'Harshitha R',
              password: '$2b$10$demoPasswordHashPlaceholderForTestingOnly',
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
        }

        req.user = demoUser;
        return next();
      }
      throw new UnauthorizedError('Demo authentication is disabled');
    }

    // Verify token
    const decoded = verifyToken(token);

    // Fetch user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
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
      throw new UnauthorizedError('User no longer exists');
    }

    // Attach to request
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}
