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

```bash
cp .env.example .env
docker compose -f infra/docker/compose.dev.yml up -d
# API:  http://localhost:3001/api
# Web:  http://localhost:3000
# Docs: http://localhost:3001/api/docs
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
