# CollabAI

AI-first collaboration SaaS foundation built as a pnpm/Turborepo monorepo.

## Structure

- `apps/web`: Next.js 15 and React 19 client; Tailwind entrypoint and typed routes are configured.
- `apps/api`: Express service boundary; its `/health` endpoint is intentionally the only endpoint.
- `apps/api/prisma`: PostgreSQL Prisma datasource only—no models have been created.
- `packages/contracts`: future UI-neutral, versioned API DTO package for both web and React Native.
- `packages/ui`: future shared Shadcn component package.
- `packages/ai`: future provider-agnostic AI service boundary.
- `infrastructure`: Docker, Nginx, monitoring, and automation deployment assets.
- `docs`: architectural and operational decisions.

## Local development

Run `corepack enable`, `pnpm install`, then `pnpm dev`. Copy environment templates before starting services. Workspace commands include `pnpm build`, `pnpm lint`, `pnpm typecheck`, and `pnpm format:check`.

## Client-compatible API strategy

All production endpoints should use `/api/v1`, JSON payloads, stateless bearer credentials, cursor pagination, and stable DTOs published from `@collabai/contracts`. The API must not depend on Next.js session or browser state, so the same contract works for React Native.

## Security and boundaries

Keep environment variables server-side by default; only intentional `NEXT_PUBLIC_` values enter the web bundle. Add Zod validation at request boundaries, use Helmet/CORS/rate limits in Express, and isolate external systems behind adapters. Authentication, domain business logic, and database models are deliberately excluded from this foundation.
