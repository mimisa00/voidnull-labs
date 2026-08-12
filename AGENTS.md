# AGENTS.md

Single product: a NestJS API (`apps/api`) + Next.js 14 web app (`apps/web`). It is **not** a lab/experiments repo and **not** a working monorepo.

**The prose docs in this repo frequently contradict reality.** README, `design/architecture_spec.md`, and parts of `docs/code-standards.md` describe tooling that isn't installed and rules that aren't enforced. Trust, in this order: executable source > `package.json` scripts / config files > docs. When a doc conflicts with a config, follow the config and say so rather than "fixing" the code to match the doc.

## Commands

`npm` only (`package-lock.json` v3). No `packageManager`, no `engines`, no `.nvmrc` — the only Node signal is CI's `NODE_VERSION: '22'`.

| Task | Command |
|---|---|
| Dev (API only) | `npm run start:dev` |
| Build | `npm run build` (see trap) |
| Lint | `npm run lint:check` (`npm run lint` auto-fixes) |
| Format | `npm run format` |
| All tests | `npm test` |
| One test file | `npx jest apps/api/test/guards/roles.guard.spec.ts` |
| Prisma | `npm run prisma:generate` / `prisma:migrate` / `prisma:seed` |

Traps:

- There is **no `npm run dev`**. `start:dev` starts the API only — web is started separately from `apps/web`.
- DB scripts are prefixed `prisma:`, **not `db:`**. `db:generate` / `db:migrate` / `db:seed` do not exist at root.
- `npm test`'s glob is broken on Windows (`Invalid testPattern ... Running all tests instead`) and silently falls back to the full suite; it happens to match `jest.config.js` `testMatch`, so it passes. Verified: 2 suites / 8 tests.
- Do **not** use `npm test -- <file>` — the root script already carries its own broken glob argument. Use `npx jest <file>`.
- `npm run test --workspace=...` does not work. This is not an npm workspace.
- `npm run format` globs `libs/**/*.ts`; `libs/` does not exist.
- `npm run build` runs `nest build`, but root has neither `nest-cli.json` nor `tsconfig.json` (both only in `apps/api/`). **Unverified — likely fails from root.** Build from `apps/api` if it does.
- No `typecheck` script. Closest is `npx tsc --noEmit -p apps/api/tsconfig.json` (unverified).

## Repo layout & the broken workspace

Root `package.json` has **no `workspaces` field**; there is no `pnpm-workspace.yaml`. `apps/api`, `apps/web`, `packages/database` are `"extraneous": true` in the lockfile. `turbo` and `next` are **not** in root `node_modules`. `turbo.json` exists but is a **dead file** — its task deps (`test dependsOn ^build`, `db:seed dependsOn db:migrate`) never run. `apps/api/node_modules` does not exist (it uses root deps); `apps/web` and `packages/database` have their own. `apps/web/package.json` has a suspicious self-referential dep `"voidnull-labs": "file:../.."`.

- `apps/api` — all business logic (auth, users, rbac, game, gateway, redis, prisma).
- `apps/web` — Next.js App Router + Tailwind + shadcn/ui.
- `packages/database` — Prisma seed + a 10-line re-export of `@prisma/client` (`packages/database/src/index.ts`). **Grep confirms zero imports of `@voidnull/database` anywhere.** `apps/api/src/prisma/prisma.service.ts` imports `PrismaClient` directly. Do not assume `packages/*` is a shared layer.
- `packages/tsconfig` — dead; nothing extends `base.json`, and its declared `nextjs.json`/`nestjs.json` don't exist.
- `prisma/` (root) — authoritative schema + the only real migration SQL.
- `infra/` — `docker/` (dev/staging/prod compose, certbot) and `nginx/` are **siblings**, not nested. `monitoring/` is at the **repo root**, not under `infra/` — a separate compose, not wired in.

## Prisma / schema conflict — READ FIRST

**`prisma/schema.prisma` at repo root is the authoritative schema.** `packages/database/prisma/schema.prisma` is stale and non-canonical — do not edit it as if it were live, and do not "sync" one to the other without being asked.

There is a **known, unresolved defect** here. Do not paper over it:

1. `apps/api/src/auth/auth.service.ts` reads/writes `twoFASecret` and `is2FAEnabled`. Neither exists in the root schema or its migration — root has `is2faEnabled` (different casing) and **no** `twoFASecret` column at all. **2FA is broken against a migrated DB.**
2. CI and docker compose run `prisma migrate deploy` inside `packages/database`, whose `prisma/migrations/` directory exists but is **empty** — the only real migration is root `prisma/migrations/20260731084412_init/`.

If you touch auth or migrations, surface this to the user and get a decision. Do not silently add columns, silently switch the canonical schema, or silently redirect the migrate step — each of those changes product behaviour.

Also: `prisma generate` should run **only** in `packages/database`. `apps/api/Dockerfile.dev` has an explicit comment that API-side generate was removed to avoid a duplicate client — don't add `@prisma/client` or a generate step under `apps/api`. `packages/database/prisma/game.schema.prisma` is a fragment with no `generator`/`datasource` block; Prisma never loads it.

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

- `.github/workflows/ci.yml`, job `lint-and-test` (push to main/develop/staging, PR to main/develop), services postgres:16-alpine + redis:7-alpine. Order: `npm ci` → `npx prisma generate` (in `packages/database`) → `npx prisma migrate deploy` (in `packages/database`, **the broken step above**) → `npm run lint` → `npm run test -- --passWithNoTests`. Note CI runs `lint` (with `--fix`), not `lint:check`, and `--passWithNoTests` makes the test gate weak — green CI is not strong evidence.
- Job `build` (needs lint-and-test, main/staging only) does ghcr.io login + docker build of `apps/api/Dockerfile` and `apps/web/Dockerfile` with context = repo root. Also `deploy-staging.yml` (SSH to `/opt/voidnull`, compose pull, migrate, rolling restart, health check) and `deploy-prod.yml`.
- `.gitlab-ci.yml.example` is **not active**, despite README claiming GitLab CI.
- `.husky/pre-commit` is **active**: `npx lint-staged` then `npm test --silent`. **Every commit runs the full test suite (~18s).** No commitlint.
- Remote `github.com/mimisa00/voidnull-labs`. **`main` is the only branch** — README's `develop`/`staging` do not exist. Commit messages are loose Conventional Commits (`feat:`/`fix:`/`chore:`/`docs:`/`refactor:`, no scopes); many have no prefix. English.
- `CLAUDE.md` and the old `AGENTS.md` were intentionally deleted. Do not recreate `CLAUDE.md`.

## Do not touch / security

`infra/docker/certbot/conf/` holds **real Let's Encrypt certificates and private keys** for `staging.voidnull.io` (`privkey.pem`, account `private_key.json`) on local disk. They are **not tracked by git** and are correctly excluded by `.gitignore` (lines 32-33) — keep it that way. `infra/docker/certbot/cloudflare.ini` (untracked, `.gitignore:34`) and real `.env` files are also on disk. Never read, echo, print, or commit their contents, and never `git add -f` them. If a task requires them, stop and tell the user.

## Known broken or disabled

- **2FA + `packages/database` migrate path** — see the Prisma section. Highest-risk item in the repo.
- **`game` module is half-removed**: `app.gateway.ts`'s three `game:*` handlers all return `{ success: false, error: 'Game service not available' }` and the `GameService` import is commented out, yet `GameModule` is still registered, `GameController` still exposes full REST CRUD, and `apps/web/src/app/games/blackjack/` still exists. **REST works, WebSocket does not.**
- **`ThrottlerModule` is commented out in `app.module.ts`** — there is currently **no rate limiting**, despite `docs/spec.md:225` claiming 60 requests/minute.
- **ESLint enforces nothing** (empty `rules: {}`).
- **`turbo.json` is dead config** (turbo not installed).
- Stale/iteration leftovers, not canonical: `packages/database/prisma/seed_fixed.ts`, `manual_seed.ts` (uses a `roleId_permissionId` composite unique that neither schema defines — it cannot run), `packages/database/create-admin.js`, `create-admin-host.js`, `apps/api/test_login.js`, `cypress/`.
- `@docs/` is an empty directory. References to `@docs/code-standards.md` mean `docs/code-standards.md`.
- `design/architecture_spec.md` is mojibake-corrupted (UTF-8/Big5 mix) and partly unreadable — don't quote it as a spec.
- Artifacts: `.playwright-mcp/`, `.qa-artifacts/`, `test-results/`. **`test-results/` is currently untracked and not gitignored** — don't commit it.
