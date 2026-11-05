/**
 * Configuration module for environment variables.
 * Uses dotenv to load variables and zod to validate and parse them.
 */
import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load environment variables: check cwd/.env and apps/api/.env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'apps/api/.env') });

const WEAK_JWT_SECRETS = new Set([
  'replace-me',
  'replace-me-with-a-secure-secret-key-32-chars',
  'secret',
  'password',
  'changeme',
  'change-me',
  '12345678',
  '1234567890',
]);

export function validateEnv(rawEnv: Record<string, string | undefined>) {
  const envSchema = z
    .object({
      NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
      PORT: z.coerce.number().default(4000),
      DATABASE_URL: z.string().url(),
      REDIS_URL: z.string().url().optional(),
      CORS_ORIGINS: z.string().transform((val) => val.split(',').map((s) => s.trim())),
      JWT_SECRET: z.string().min(8),
      ALLOW_DEMO_AUTH: z
        .string()
        .optional()
        .transform((val) => val === 'true'),
      GOOGLE_CLIENT_ID: z.string().optional(),
      GOOGLE_CLIENT_SECRET: z.string().optional(),
      GOOGLE_REDIRECT_URI: z.string().optional(),
      FRONTEND_URL: z.string().optional().default('http://localhost:3000'),
      INTEGRATION_ENCRYPTION_KEY: z.string().optional(),
      MICROSOFT_CLIENT_ID: z.string().optional(),
      MICROSOFT_CLIENT_SECRET: z.string().optional(),
      SLACK_CLIENT_ID: z.string().optional(),
      SLACK_CLIENT_SECRET: z.string().optional(),
      ZOOM_CLIENT_ID: z.string().optional(),
      ZOOM_CLIENT_SECRET: z.string().optional(),
    })
    .superRefine((data, ctx) => {
      // 1. Enforce production JWT secret strength and disallow known placeholders
      if (data.NODE_ENV === 'production') {
        if (data.JWT_SECRET.length < 32) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['JWT_SECRET'],
            message: 'In production, JWT_SECRET must be at least 32 characters long.',
          });
        }
        if (WEAK_JWT_SECRETS.has(data.JWT_SECRET.trim().toLowerCase())) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['JWT_SECRET'],
            message: 'In production, JWT_SECRET cannot be a default or known weak placeholder.',
          });
        }
      }

      // 2. Enforce demo auth safety in production
      if (data.NODE_ENV === 'production' && data.ALLOW_DEMO_AUTH) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['ALLOW_DEMO_AUTH'],
          message: 'ALLOW_DEMO_AUTH must not be enabled when NODE_ENV is production.',
        });
      }
    });

  return envSchema.safeParse(rawEnv);
}

const parsed = validateEnv(process.env);

if (!parsed.success) {
  // Sanitize errors: ensure secret values themselves are never logged
  const sanitizedIssues = parsed.error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
    code: issue.code,
  }));
  console.error('❌ Invalid environment variables configuration:');
  for (const issue of sanitizedIssues) {
    console.error(`  - [${issue.path}]: ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
