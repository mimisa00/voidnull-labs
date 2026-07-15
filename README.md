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

> **前置步驟：關於 `package-lock.json`**
>
> `package-lock.json` 記錄每個套件的精確版本，確保所有人與各環境的安裝結果一致。
>
> **何時需要重跑 `npm install`**
>
> | 情況 | 指令 |
> |------|------|
> | 首次 clone，本機開發用 | `npm install` |
> | 新增、移除或升級套件後 | `npm install`，並將更新後的 `package-lock.json` commit 進版控 |
> | 僅 clone 下來同步環境（未改套件） | `npm ci`（照 lockfile 精確安裝） |
> | Docker build（整合測試站／正式站） | 不需手動執行，Dockerfile 內已寫好 `npm ci` |
>
> 首次建立 lockfile 後，執行以下指令提交：
>
> ```bash
> npm install
> git add package-lock.json
> git commit -m "chore: add package-lock.json"
> ```
>
> 之後只有在變更套件時才需重跑 `npm install` 並重新提交 lockfile。各站台 clone 後直接 Docker build 即可，無需手動執行任何 npm 指令。

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
