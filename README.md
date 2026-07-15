# VoidNull Platform

Full-stack monorepo — NestJS + Next.js 14 + PostgreSQL + Redis + Socket.io + Turborepo

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | NestJS 10 (TypeScript) |
| Frontend | Next.js 14 (App Router) + Tailwind CSS + shadcn/ui |
| Database | PostgreSQL 16 + Prisma ORM |
| Cache / Sessions | Redis 7 |
| Real-time | Socket.io 4 |
| Auth | JWT (Access + Refresh) + TOTP 2FA |
| RBAC | Permission-based (NestJS Guards) |
| Monorepo | Turborepo 2 |
| Infra | Docker Compose + Nginx + Let's Encrypt |
| CI/CD | GitHub Actions + GitLab CI |
| Monitoring | Prometheus + Grafana + ELK |

## Structure

```
voidnull/
├── apps/
│   ├── api/          # NestJS backend
│   └── web/          # Next.js frontend
├── packages/
│   ├── database/     # Prisma schema + seed
│   └── tsconfig/     # Shared TS config
├── infra/
│   ├── docker/       # Compose files (dev/staging/prod)
│   ├── nginx/        # Nginx configs
│   └── certbot/      # Let's Encrypt scripts
├── monitoring/       # Prometheus + Grafana + ELK
├── .github/          # GitHub Actions CI/CD
├── .gitlab-ci.yml    # GitLab CI/CD
└── docs/
    └── ops-manual.md # Operations manual (中文)
```

## Quick Start

> **Prerequisites: `package-lock.json`**
>
> `package-lock.json` pins the exact version of every dependency, ensuring consistent installs across all contributors and environments.
>
> **When to run `npm install`**
>
> | Situation | Command |
> |-----------|---------|
> | First clone, local development | `npm install` |
> | After adding, removing, or upgrading a package | `npm install`, then commit the updated `package-lock.json` |
> | Cloning without changing packages | `npm ci` (installs exactly what the lockfile specifies) |
> | Docker build (staging / production) | No action needed — `npm ci` is already in the Dockerfile |
>
> After generating the lockfile for the first time, commit it:
>
> ```bash
> npm install
> git add package-lock.json
> git commit -m "chore: add package-lock.json"
> ```
>
> After that, only re-run `npm install` when dependencies change and commit the updated lockfile. All other environments just need a `docker compose` build — no manual npm commands required.

> **Prerequisites: Database migrations**
>
> On every startup, the `migrate` service runs `prisma migrate deploy`, which checks which migrations have not yet been applied and runs them automatically. This works for all environments — dev, staging, and production — with no manual intervention required.
>
> However, **migration files must exist in the repository first.** If `packages/database/prisma/migrations/` is missing (e.g. on a fresh clone of a brand-new repo), the migrate service will find nothing to apply and the database tables will never be created.
>
> **One-time setup — do this once and commit:**
>
> ```bash
> # Ensure the postgres container is running first
> docker compose -f infra/docker/compose.dev.yml up -d postgres
>
> set DATABASE_URL=postgresql://voidnull:secret@localhost:5432/voidnull_dev
> cd packages/database
> npx prisma migrate dev --name init
> ```
>
> ```bash
> git add packages/database/prisma/migrations/
> git commit -m "chore: add initial prisma migration"
> ```
>
> After this is committed, everyone who clones the repo — on any environment — will have tables created automatically on first `docker compose up`.
>
> **When the schema changes later:**
>
> ```bash
> # After editing schema.prisma
> npx prisma migrate dev --name <describe-the-change>
> git add packages/database/prisma/migrations/
> git commit -m "chore: add migration for <describe-the-change>"
> ```
>
> Other environments pick up the new migration automatically on next startup — no manual steps needed.

```bash
cp .env.example .env
docker compose -f infra/docker/compose.dev.yml up -d
# API:  http://localhost:3001/api
# Web:  http://localhost:3000
# Docs: http://localhost:3001/api/docs

# docker compose -f infra/docker/compose.dev.yml down
```

**Default accounts after seed:**
- `admin@voidnull.io` / `Admin@123456` (admin role — all permissions)
- `moderator@voidnull.io` / `Test@123456` (moderator role)
- `viewer@voidnull.io` / `Test@123456` (viewer role)

## RBAC Model

```
User ──has many──▶ Role ──has many──▶ Permission
                                       (resource:action)
```

Permissions format: `users:create`, `users:read`, `roles:list`, `permissions:list`, etc.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/login | Login (returns tokens or 2FA challenge) |
| POST | /api/auth/2fa/verify | Complete 2FA login |
| POST | /api/auth/register | Register |
| POST | /api/auth/refresh | Refresh access token |
| POST | /api/auth/logout | Logout + revoke tokens |
| GET | /api/auth/me | Current user info |
| GET | /api/auth/2fa/generate | Generate TOTP QR code |
| POST | /api/auth/2fa/enable | Enable 2FA |
| GET | /api/users | List users (perm: users:list) |
| GET | /api/roles | List roles (perm: roles:list) |
| GET | /api/permissions | List permissions |

Full Swagger docs: `http://localhost:3001/api/docs`

## check all services logs
# all services log
docker compose -f infra/docker/compose.dev.yml logs -f

# single service log
docker compose -f infra/docker/compose.dev.yml logs -f web
docker compose -f infra/docker/compose.dev.yml logs -f api
docker compose -f infra/docker/compose.dev.yml logs -f postgres

# multiple services log
docker compose -f infra/docker/compose.dev.yml logs -f api web