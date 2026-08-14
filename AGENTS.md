# AGENTS.md

Single product: a NestJS API (`apps/api`) + Next.js 14 web app (`apps/web`). It is **not** a lab/experiments repo and **not** a working monorepo.

**The prose docs in this repo frequently contradict reality.** README, `design/architecture_spec.md`, and parts of `docs/code-standards.md` describe tooling that isn't installed and rules that aren't enforced. Trust, in this order: executable source > `package.json` scripts / config files > docs. When a doc conflicts with a config, follow the config and say so rather than "fixing" the code to match the doc.

## Commands

`npm` only (`package-lock.json` v3). No `packageManager`, no `engines`, no `.nvmrc` — the only Node signal is CI's `NODE_VERSION: '22'`.

### Local development: npm vs. docker compose (choose one)

**Recommended: docker compose** (`infra/docker/compose.dev.yml`). Starts all services (postgres, redis, api, web) with hot-reload via volume mounts. API and web containers run `npm run dev` internally; code changes in `apps/api/src` and `apps/web/src` are reflected instantly without rebuild or restart.

| Task | Command |
|---|---|
| Start all (docker) | `cd infra/docker && docker compose -f compose.dev.yml up -d` |
| Service status (docker) | `docker compose -f compose.dev.yml ps` |
| Logs (docker) | `docker compose -f compose.dev.yml logs -f api` (or `web`) |
| Restart service (docker) | `docker compose -f compose.dev.yml restart api` (or `web`) — rarely needed due to watch mode |
| Stop all (docker) | `docker compose -f compose.dev.yml down` |
| Dev (API only, npm) | `npm run start:dev` |
| Dev (web only, npm) | `cd apps/web && npm run dev` |
| Build | `npm run build` (see trap) |
| Lint | `npm run lint:check` (`npm run lint` auto-fixes) |
| Format | `npm run format` |
| All tests | `npm test` |
| One test file | `npx jest apps/api/test/guards/roles.guard.spec.ts` |
| Prisma | `npm run prisma:generate` / `prisma:migrate` / `prisma:seed` |

Traps:

- **Do not mix docker compose and npm dev modes.** Both try to bind the same ports (api 3001, web 3000). If docker is already running, do **not** start `npm run start:dev` or `cd apps/web && npm run dev` — they will fail with port conflicts. Conversely, if you want to use npm locally, stop docker first: `docker compose -f compose.dev.yml down`.
- There is **no `npm run dev`**. `start:dev` starts the API only — web must be started separately with `cd apps/web && npm run dev`.
- DB scripts are prefixed `prisma:`, **not `db:`**. `db:generate` / `db:migrate` / `db:seed` do not exist at root.
- `npm test`'s glob is broken on Windows (`Invalid testPattern ... Running all tests instead`) and silently falls back to the full suite; it happens to match `jest.config.js` `testMatch`, so it passes. Verified: 2 suites / 8 tests.
- Do **not** use `npm test -- <file>` — the root script already carries its own broken glob argument. Use `npx jest <file>`.
- `npm run test --workspace=...` does not work. This is not an npm workspace.
- `npm run format` globs `libs/**/*.ts`; `libs/` does not exist.
- `npm run build` runs `nest build`, but root has neither `nest-cli.json` nor `tsconfig.json` (both only in `apps/api/`). **Unverified — likely fails from root.** Build from `apps/api` if it does.
- No `typecheck` script. Closest is `npx tsc --noEmit -p apps/api/tsconfig.json` (unverified).

## Repo layout & the broken workspace

Root `package.json` has **no `workspaces` field**; there is no `pnpm-workspace.yaml`. `turbo` and `next` are **not** in root `node_modules`. `turbo.json` exists but is a **dead file** — its task deps (`test dependsOn ^build`, `db:seed dependsOn db:migrate`) never run. `apps/api/node_modules` does not exist (it uses root deps); `apps/web` has its own. `apps/web/package.json` has a suspicious self-referential dep `"voidnull-labs": "file:../.."`. **`packages/` directory was removed on 2026-08-12 (commits 005c328, c8cf0ba); all Prisma-related files (schema, migrations, seed) are now consolidated at repo root.**

- `apps/api` — all business logic (auth, users, rbac, game, gateway, redis, prisma).
- `apps/web` — Next.js App Router + Tailwind + shadcn/ui.
- `prisma/` (root) — authoritative schema + migrations. Prisma seed and code generation now run from root.
- `infra/` — `docker/` (dev/staging/prod compose, certbot) and `nginx/` are **siblings**, not nested. `monitoring/` is at the **repo root**, not under `infra/` — a separate compose, not wired in.

## Docker compose dev environment

`infra/docker/compose.dev.yml` defines the local development stack:

- **postgres** (port 5432): database, user `voidnull`
- **redis** (port 6379): cache
- **api** (port 3001): built from `Dockerfile.dev`, volume mounts `apps/api/src:ro` + `prisma:ro`, runs `npm run dev` internally
- **web** (port 3000): built from `Dockerfile.dev`, volume mounts `apps/web/src:ro` + `apps/web/public`, runs `npm run dev` internally
- **migrate** (one-shot): runs `prisma migrate deploy` on startup

**Key fact**: API and web containers use volume mounts + watch mode. Editing `apps/api/src` or `apps/web/src` files on your machine is reflected instantly in the container and recompiled automatically — **no image rebuild or container restart needed**.

### Service endpoints (docker compose)

- Web: http://localhost:3000
- API: http://localhost:3001/api
- Swagger: http://localhost:3001/api/docs
- Postgres: `localhost:5432` (user: `voidnull`)
- Redis: `localhost:6379`

### Test credentials

These are seeded into the database by `prisma:seed`:

- `admin@voidnull.io` / `Admin@123456` (admin role)
- `user@voidnull.io` / `User@123456` (user role)

## Prisma / schema conflict — READ FIRST

**`prisma/schema.prisma` at repo root is the authoritative schema.** All Prisma operations (generate, migrate, seed) now run from root against this schema.

**2FA defect — RESOLVED**: This section documents a **previously unresolved defect that has been fixed**. For context: `apps/api/src/auth/auth.service.ts` previously read/wrote `twoFASecret` and `is2FAEnabled`, but the root schema had neither the `twoFASecret` column nor consistent casing for `is2FAEnabled`. **This was fully resolved in commit 005c328 (2026-08-12)**: the schema now includes `twoFASecret String?`, all code references to `is2FAEnabled` were unified to `is2faEnabled` (6 occurrences across `auth.service.ts` and `users.service.ts`), and migration `20260812062027_add_two_fa_secret` was added to sync the DB. **If you encounter 2FA field mismatches again, that is a new regression, not the old issue resurfacing.** Surface it to the user immediately.

CI and docker compose now run `prisma migrate deploy` and `prisma generate` from repo root against `prisma/migrations/` (currently: `20260731084412_init/` and `20260812062027_add_two_fa_secret`). `apps/api/Dockerfile.dev` contains `RUN npx prisma generate` (operating on root schema), though an outdated comment nearby claims "Removed prisma generate for API to avoid duplicate client" — this comment contradicts the actual code and is a documentation artifact awaiting cleanup.

## Architecture & wiring gotchas

- `PrismaModule` and `RedisModule` are `@Global()`. Feature modules must **not** re-import them to inject `PrismaService` / `RedisService`.
- Global `ValidationPipe` uses `whitelist` + `forbidNonWhitelisted` — **extra fields in a request body return 400**, not a silent strip. Global prefix `api`, URI versioning, Swagger at `/api/docs`, listens on `0.0.0.0:${API_PORT||3001}`.
- Permissions are **flattened into the JWT at login** (`auth.service.ts` `generateTokenPair`). `PermissionsGuard` reads only the token, never the DB. **Changing permissions in the DB has no effect on issued tokens** until the 15m access token expires or is refreshed.
- Web auth token storage is inconsistent across **four** files with three conflicting assumptions: `middleware.ts` reads only the **cookie**; the axios interceptor in `lib/api.ts` prefers **localStorage** then falls back to cookie; the login page writes **only the cookie**; `use-auth.ts` reads **only localStorage** and base64-decodes the JWT itself. Note that **nothing writes localStorage on login** (only `lib/api.ts` does, on refresh), so `use-auth.ts` sees no user until a token refresh happens. Read all four before changing anything auth-related.
- Web → API goes through `next.config.mjs` rewrites (`/api/*` → `API_INTERNAL_URL`, in-container `http://api:3001/api`). All API calls belong in `apps/web/src/lib/api.ts` (`authApi`/`usersApi`/`rolesApi`/`permissionsApi`) — do not scatter axios calls in components.
- `app.gateway.ts` verifies the handshake token manually and joins `user:<sub>` / `role:<name>` rooms. Its CORS is `origin: '*'`, inconsistent with the strict HTTP CORS.
- **Env precedence trap**: `ConfigModule` loads `.env.local` before `.env`, and cwd is `apps/api/` (the script does `cd apps/api && ...`), so **`apps/api/.env` wins locally — not root `.env`**. Docker ignores both and uses compose `environment:` blocks. Three possible sources for the same variable.
- Docker build context is the repo root (`context: ../..`), so paths inside Dockerfiles are `apps/api/...`.
- No root `.env.example`. Examples are `infra/docker/.env.dev.example` (+ staging/prod). Required: `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET` / `JWT_REFRESH_SECRET` / `JWT_2FA_SECRET` (each ≥32 chars), `API_PORT=3001`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WS_URL`.

## Conventions for new code

- **`.prettierrc` sets `semi: false` — no semicolons**, single quotes, trailing commas, 2 spaces. This contradicts typical NestJS style and is the single most common thing agents get wrong here.
- `eslint.config.js` is flat config with **`rules: {}` — completely empty**. ESLint parses but enforces nothing. `eslint-plugin-boundaries`, `eslint-config-prettier`, `eslint-plugin-prettier`, and `typescript-eslint` are installed but referenced by nothing. The import-boundary layering that `docs/code-standards.md` claims is enforced is **not** enforced — a clean lint run proves nothing about style.
- TypeScript: no root tsconfig, no project references. `apps/api/tsconfig.json` has `strictNullChecks: true` but **`noImplicitAny: false`**, `strictBindCallApply: false`, alias `@/*` → `src/*`. `apps/web/tsconfig.json` is full `strict: true`, `moduleResolution: bundler`, alias `@/*` → `./src/*`. `design/architecture_spec.md` demands `strict`/`noImplicitAny` everywhere — the actual tsconfig wins.
- API feature layout: `<feature>/<feature>.module.ts` + `.controller.ts` + `.service.ts`, DTOs in `<feature>/dto/`, guards in `<feature>/guards/`, decorators in `<feature>/decorators/`. auth/users/rbac follow this; `game/` is the exception (flat `game.dto.ts`) — follow auth/users/rbac.
- Controllers: `@ApiTags` + `@ApiBearerAuth()` + class-level `@UseGuards(JwtAuthGuard, PermissionsGuard)` + method-level `@Permissions('resource:action')`. Permission strings are always lowercase `resource:action`.
- Services throw built-in Nest HTTP exceptions (`NotFoundException`, `UnauthorizedException`, `ConflictException`, `ForbiddenException`, `BadRequestException`). There are **no** custom exception classes and no global exception filter — don't introduce one unasked. Update/delete methods call `await this.findOne(id)` first to trigger the 404.
- Constructor DI is written `private xxx: Service` (not `readonly`).
- Web: `"use client"` at the top of client components. `components/ui/` is shadcn-generated (`components.json` present) — put custom components in `components/`.
- Naming (from `docs/code-standards.md`, still valid): PascalCase classes, UPPER_SNAKE_CASE constants, camelCase vars/functions, kebab-case filenames.
- **`console.log` is not the logging convention.** Leftover debug logs sit on production paths (`auth.service.ts` logs the whole user object, `auth.controller.ts` logs the login body, the login page logs `'Button clicked'`). That's tech debt. NestJS `Logger` is used only in `app.gateway.ts`.

## Testing

- Root `jest.config.js` `testMatch: ['<rootDir>/apps/api/**/*.spec.ts']` — jest covers **`apps/api` only**; `apps/web` is entirely outside it.
- The only tests jest actually runs are `apps/api/test/guards/permissions.guard.spec.ts` and `roles.guard.spec.ts`. Both are pure unit tests on guards and need **no DB or Redis** (verified passing with no services up).
- `apps/web/e2e/*.spec.ts` holds 5 Playwright specs but **there is no `playwright.config.*` anywhere**. `login-debug`, `inspect-outer`, and `inspect-login` are debug specs, not regression tests.
- `cypress/e2e/dashboard.spec.ts` is an orphan — no cypress config, cypress in no `package.json`.
- No coverage thresholds anywhere.

## CI, hooks, git

- `.github/workflows/ci.yml`, job `lint-and-test` (push to main/develop/staging, PR to main/develop), services postgres:16-alpine + redis:7-alpine. Order: `npm ci` → `npx prisma generate` → `npx prisma migrate deploy` → `npm run lint` → `npm run test -- --passWithNoTests`. Note CI runs `lint` (with `--fix`), not `lint:check`, and `--passWithNoTests` makes the test gate weak — green CI is not strong evidence.
- Job `build` (needs lint-and-test, main/staging only) does ghcr.io login + docker build of `apps/api/Dockerfile` and `apps/web/Dockerfile` with context = repo root. Also `deploy-staging.yml` (SSH to `/opt/voidnull`, compose pull, migrate, rolling restart, health check) and `deploy-prod.yml`.
- `.gitlab-ci.yml.example` is **not active**, despite README claiming GitLab CI.
- `.husky/pre-commit` is **active**: `npx lint-staged` then `npm test --silent`. **Every commit runs the full test suite (~18s).** No commitlint.
- Remote `github.com/mimisa00/voidnull-labs`. **`main` is the only branch** — README's `develop`/`staging` do not exist. Commit messages are loose Conventional Commits (`feat:`/`fix:`/`chore:`/`docs:`/`refactor:`, no scopes); many have no prefix. English.
- `CLAUDE.md` and the old `AGENTS.md` were intentionally deleted. Do not recreate `CLAUDE.md`.

## Do not touch / security

`infra/docker/certbot/conf/` holds **real Let's Encrypt certificates and private keys** for `staging.voidnull.io` (`privkey.pem`, account `private_key.json`) on local disk. They are **not tracked by git** and are correctly excluded by `.gitignore` (lines 32-33) — keep it that way. `infra/docker/certbot/cloudflare.ini` (untracked, `.gitignore:34`) and real `.env` files are also on disk. Never read, echo, print, or commit their contents, and never `git add -f` them. If a task requires them, stop and tell the user.

## Known broken or disabled

- **`game` module is half-removed**: `app.gateway.ts`'s three `game:*` handlers all return `{ success: false, error: 'Game service not available' }` and the `GameService` import is commented out, yet `GameModule` is still registered, `GameController` still exposes full REST CRUD, and `apps/web/src/app/games/blackjack/` still exists. **REST works, WebSocket does not.**
- **`ThrottlerModule` is commented out in `app.module.ts`** — there is currently **no rate limiting**, despite `docs/spec.md:225` claiming 60 requests/minute.
- **ESLint enforces nothing** (empty `rules: {}`).
- **`turbo.json` is dead config** (turbo not installed).
- Stale/iteration leftovers, not canonical: `apps/api/test_login.js`, `cypress/`.
- `@docs/` is an empty directory. References to `@docs/code-standards.md` mean `docs/code-standards.md`.
- `design/architecture_spec.md` is mojibake-corrupted (UTF-8/Big5 mix) and partly unreadable — don't quote it as a spec.
- Artifacts: `.playwright-mcp/`, `.qa-artifacts/`, `test-results/`. **`test-results/` is currently untracked and not gitignored** — don't commit it.
