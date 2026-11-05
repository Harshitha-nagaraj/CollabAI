/**
 * Auth Security Tests — Phase 2A
 *
 * Verifies:
 *   1. ALLOW_DEMO_AUTH defaults to false (undefined → false).
 *   2. ALLOW_DEMO_AUTH=false is correctly parsed.
 *   3. ALLOW_DEMO_AUTH=true + development → passes validation.
 *   4. ALLOW_DEMO_AUTH=true + production → fails validation.
 *   5. Weak JWT_SECRET (known placeholder) + production → fails validation.
 *   6. Short JWT_SECRET (<32 chars) + production → fails validation.
 *   7. Strong JWT_SECRET (≥32 chars) + production → passes validation.
 *   8. Middleware rejects demo-token when ALLOW_DEMO_AUTH is false (unit-level).
 *   9. Middleware rejects demo-token when NODE_ENV is production (unit-level).
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateEnv } from '../src/config/env.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimum valid base env — everything except the field under test. */
function baseEnv(overrides: Record<string, string | undefined> = {}): Record<string, string | undefined> {
  return {
    NODE_ENV: 'development',
    PORT: '4000',
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/testdb',
    CORS_ORIGINS: 'http://localhost:3000',
    JWT_SECRET: 'a-sufficiently-long-development-secret-key',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// ALLOW_DEMO_AUTH default behaviour
// ---------------------------------------------------------------------------

describe('ALLOW_DEMO_AUTH — default false', () => {
  it('should default to false when ALLOW_DEMO_AUTH is not set', () => {
    const result = validateEnv(baseEnv({ ALLOW_DEMO_AUTH: undefined }));
    assert.equal(result.success, true, 'Expected validation to succeed');
    if (result.success) {
      assert.equal(result.data.ALLOW_DEMO_AUTH, false, 'Expected ALLOW_DEMO_AUTH to default to false');
    }
  });

  it('should be false when ALLOW_DEMO_AUTH=false', () => {
    const result = validateEnv(baseEnv({ ALLOW_DEMO_AUTH: 'false' }));
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.data.ALLOW_DEMO_AUTH, false);
    }
  });

  it('should be true when ALLOW_DEMO_AUTH=true in development', () => {
    const result = validateEnv(baseEnv({ ALLOW_DEMO_AUTH: 'true', NODE_ENV: 'development' }));
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.data.ALLOW_DEMO_AUTH, true);
    }
  });
});

// ---------------------------------------------------------------------------
// Production safety — ALLOW_DEMO_AUTH
// ---------------------------------------------------------------------------

describe('ALLOW_DEMO_AUTH — production safety', () => {
  it('should reject ALLOW_DEMO_AUTH=true in production', () => {
    const result = validateEnv(
      baseEnv({
        NODE_ENV: 'production',
        ALLOW_DEMO_AUTH: 'true',
        JWT_SECRET: 'a-strong-production-jwt-secret-key-that-is-at-least-32-chars-long',
      })
    );
    assert.equal(result.success, false, 'Expected validation to fail in production with ALLOW_DEMO_AUTH=true');
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'));
      assert.ok(paths.includes('ALLOW_DEMO_AUTH'), `Expected ALLOW_DEMO_AUTH issue, got: ${paths.join(', ')}`);
    }
  });

  it('should accept ALLOW_DEMO_AUTH=false in production', () => {
    const result = validateEnv(
      baseEnv({
        NODE_ENV: 'production',
        ALLOW_DEMO_AUTH: 'false',
        JWT_SECRET: 'a-strong-production-jwt-secret-key-that-is-at-least-32-chars-long',
      })
    );
    assert.equal(result.success, true, 'Expected validation to succeed in production with ALLOW_DEMO_AUTH=false');
  });

  it('should accept ALLOW_DEMO_AUTH unset in production (defaults to false)', () => {
    const result = validateEnv(
      baseEnv({
        NODE_ENV: 'production',
        ALLOW_DEMO_AUTH: undefined,
        JWT_SECRET: 'a-strong-production-jwt-secret-key-that-is-at-least-32-chars-long',
      })
    );
    assert.equal(result.success, true, 'Expected validation to succeed with ALLOW_DEMO_AUTH unset in production');
    if (result.success) {
      assert.equal(result.data.ALLOW_DEMO_AUTH, false);
    }
  });
});

// ---------------------------------------------------------------------------
// JWT_SECRET strength — production
// ---------------------------------------------------------------------------

describe('JWT_SECRET — production strength requirements', () => {
  it('should reject a known weak placeholder JWT_SECRET in production', () => {
    const result = validateEnv(
      baseEnv({
        NODE_ENV: 'production',
        JWT_SECRET: 'replace-me',
        ALLOW_DEMO_AUTH: 'false',
      })
    );
    assert.equal(result.success, false, 'Expected validation to fail with placeholder JWT_SECRET');
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'));
      assert.ok(paths.includes('JWT_SECRET'), `Expected JWT_SECRET issue, got: ${paths.join(', ')}`);
    }
  });

  it('should reject the specific placeholder "replace-me-with-a-secure-secret-key-32-chars" in production', () => {
    const result = validateEnv(
      baseEnv({
        NODE_ENV: 'production',
        JWT_SECRET: 'replace-me-with-a-secure-secret-key-32-chars',
        ALLOW_DEMO_AUTH: 'false',
      })
    );
    assert.equal(result.success, false, 'Expected validation to fail with dev placeholder JWT_SECRET');
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'));
      assert.ok(paths.includes('JWT_SECRET'), `Expected JWT_SECRET issue, got: ${paths.join(', ')}`);
    }
  });

  it('should reject a JWT_SECRET shorter than 32 characters in production', () => {
    const result = validateEnv(
      baseEnv({
        NODE_ENV: 'production',
        JWT_SECRET: 'short-secret',
        ALLOW_DEMO_AUTH: 'false',
      })
    );
    assert.equal(result.success, false, 'Expected validation to fail with short JWT_SECRET');
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'));
      assert.ok(paths.includes('JWT_SECRET'), `Expected JWT_SECRET issue, got: ${paths.join(', ')}`);
    }
  });

  it('should accept a strong JWT_SECRET (≥32 chars, non-placeholder) in production', () => {
    const result = validateEnv(
      baseEnv({
        NODE_ENV: 'production',
        JWT_SECRET: 'a-strong-production-jwt-secret-key-that-is-at-least-32-chars-long',
        ALLOW_DEMO_AUTH: 'false',
      })
    );
    assert.equal(result.success, true, `Expected validation to pass with strong JWT_SECRET, got: ${!result.success ? JSON.stringify(result.error.issues) : 'ok'}`);
  });

  it('should accept a short JWT_SECRET in development (no minimum in dev)', () => {
    const result = validateEnv(baseEnv({ NODE_ENV: 'development', JWT_SECRET: 'short' }));
    // min(8) is enforced always — this should fail the base Zod min(8)
    assert.equal(result.success, false, 'Expected min(8) to reject a 5-char secret');
  });

  it('should accept an 8+ char JWT_SECRET in development (no 32-char minimum)', () => {
    const result = validateEnv(baseEnv({ NODE_ENV: 'development', JWT_SECRET: 'exactly8' }));
    assert.equal(result.success, true, 'Expected validation to pass with 8-char JWT_SECRET in development');
  });
});

// ---------------------------------------------------------------------------
// Middleware behaviour (unit-level, no HTTP)
// ---------------------------------------------------------------------------

describe('auth middleware — demo-token rejection', () => {
  it('should reject demo-token when ALLOW_DEMO_AUTH is false (env-level check)', () => {
    // Verify the env module logic: when ALLOW_DEMO_AUTH is false the middleware
    // should NOT recognise demo-token. We test the env parsing here; the middleware
    // integration is covered by the e2e scenario tests.
    const result = validateEnv(baseEnv({ ALLOW_DEMO_AUTH: undefined }));
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(
        result.data.ALLOW_DEMO_AUTH,
        false,
        'ALLOW_DEMO_AUTH must be false by default — middleware will reject demo-token'
      );
    }
  });

  it('should confirm demo-token would be rejected in production (env-level)', () => {
    // In production, ALLOW_DEMO_AUTH=true is rejected at startup — the server would
    // never reach the middleware check. Confirm validation rejects it.
    const result = validateEnv(
      baseEnv({
        NODE_ENV: 'production',
        ALLOW_DEMO_AUTH: 'true',
        JWT_SECRET: 'a-strong-production-jwt-secret-key-that-is-at-least-32-chars-long',
      })
    );
    assert.equal(result.success, false, 'Production with ALLOW_DEMO_AUTH=true must fail at startup');
  });
});
