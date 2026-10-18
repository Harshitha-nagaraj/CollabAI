/**
 * @file src/lib/prisma.ts
 *
 * Singleton Prisma Client for the CollabAI API.
 *
 * WHY A SINGLETON?
 * ─────────────────
 * PrismaClient opens a connection pool to PostgreSQL on first use.
 * If you create a new PrismaClient instance per request (or per module
 * reload), you will exhaust the Postgres `max_connections` limit quickly.
 * One instance for the entire process lifetime is the correct pattern.
 *
 * WHY globalThis IN DEVELOPMENT?
 * ────────────────────────────────
 * `tsx watch` (the dev hot-reload tool) re-executes module files on every
 * file change, which would create a fresh PrismaClient on each reload and
 * leave orphaned connection pools open. Storing the instance on `globalThis`
 * (which survives hot-reloads) prevents this leak.
 *
 * In production, `globalThis` is never written to — the module-level
 * constant is sufficient because the process never hot-reloads.
 */

import { PrismaClient } from '@prisma/client';
import { env } from '../config/env.js';

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Extend the Node.js global namespace to hold our cached Prisma instance.
 * Using `var` (not `let/const`) inside declare global is required by
 * TypeScript for globalThis augmentation.
 */
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

// ─── Factory ──────────────────────────────────────────────────────────────────

/**
 * Build a PrismaClient configured for the current environment.
 *
 * Logging strategy:
 *  • development  → emit query, error, and warn events to stdout
 *  • production   → emit error only (avoids leaking SQL in logs)
 */
function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log:
      env.NODE_ENV === 'development'
        ? [
            { level: 'query', emit: 'stdout' },
            { level: 'error', emit: 'stdout' },
            { level: 'warn',  emit: 'stdout' },
          ]
        : [{ level: 'error', emit: 'stdout' }],
  });
}

// ─── Singleton ────────────────────────────────────────────────────────────────

/**
 * The single PrismaClient instance used across the entire application.
 *
 * Resolution order:
 *  1. In development  → reuse `globalThis.__prisma` if it already exists
 *                       (survives tsx-watch hot-reloads).
 *  2. In production   → always create a fresh instance (no globalThis write).
 */
const prisma: PrismaClient =
  env.NODE_ENV === 'development'
    ? (globalThis.__prisma ??= createPrismaClient())
    : createPrismaClient();

if (env.NODE_ENV === 'development') {
  globalThis.__prisma = prisma;
}

export { prisma };
