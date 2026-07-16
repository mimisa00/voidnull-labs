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
│   ├── docker/       # Compose files (dev/staging/prod) + .env
│   │   └── certbot/  # Let's Encrypt init script + Cloudflare credentials
│   └── nginx/        # Nginx configs
├── monitoring/       # Prometheus + Grafana + ELK
├── .github/          # GitHub Actions CI/CD
├── .gitlab-ci.yml    # GitLab CI/CD
└── docs/
    └── ops-manual.md # Operations manual (中文)
```

---

## Environments

| | Dev | Staging | Production |
|---|---|---|---|
| Compose file | `compose.dev.yml` | `compose.staging.yml` | `compose.prod.yml` |
| Domain | `localhost` | `staging.voidnull.io` | `voidnull.io` / `voidnull.ai` |
| SSL | None | Let's Encrypt (staging cert) | Let's Encrypt (real cert) |
| Branch | `develop` | `staging` | `main` |
| Hot reload | Yes (volume mount) | No | No |
| Seed data | Yes | No | No |

All environments share the same Docker images and service topology (postgres, redis, api, web, nginx). What changes is the compose file, the `.env` values, and whether SSL is active.

---

## Quick Start

### Prerequisites

**Node / lockfile**

Run `npm install` once after cloning, then commit `package-lock.json`. After that, `docker compose up --build` handles everything — no manual npm steps needed.

```bash
npm install
git add package-lock.json
git commit -m "chore: add package-lock.json"
```

**Prisma migrations**

Migration files must exist in `packages/database/prisma/migrations/` before the first `docker compose up`. On a fresh repo clone they may not exist yet.

```bash
# Run once — requires postgres container to be up
docker compose -f infra/docker/compose.dev.yml up -d postgres

set DATABASE_URL=postgresql://voidnull:secret@localhost:5432/voidnull_dev
cd packages/database
npx prisma migrate dev --name init

# Commit so every environment picks up the migration automatically
git add prisma/migrations/
git commit -m "chore: add initial prisma migration"
```

After this is committed, all future `docker compose up` runs apply pending migrations automatically — no manual steps needed.

When the schema changes later:

```bash
npx prisma migrate dev --name <describe-the-change>
git add prisma/migrations/
git commit -m "chore: add migration for <describe-the-change>"
```

---

### Dev (local)

```bash
cp infra/docker/.env.dev.example infra/docker/.env

cd infra/docker
docker compose -f compose.dev.yml up -d

# API:  http://localhost:3001/api
# Web:  http://localhost:3000
# Docs: http://localhost:3001/api/docs
```

No SSL. Source files are volume-mounted so the API and Web containers hot-reload on save.

Default accounts after seed:

| Email | Password | Role |
|-------|----------|------|
| `admin@voidnull.io` | `Admin@123456` | admin (all permissions) |
| `moderator@voidnull.io` | `Test@123456` | moderator |
| `viewer@voidnull.io` | `Test@123456` | viewer |

---

### Staging

Staging runs on a real server with a Let's Encrypt **staging** certificate (issued by the staging CA — browsers will show a warning, which is expected).

**Step 1 — Environment variables**

```bash
cp infra/docker/.env.staging.example infra/docker/.env
# Edit infra/docker/.env — fill in POSTGRES_PASSWORD, JWT_SECRET, etc.
```

**Step 2 — SSL certificate (first deploy only)**

Domain DNS is managed on Cloudflare. Certificates use DNS-01 challenge — no HTTP server needed during validation.

```bash
cp infra/docker/certbot/cloudflare.ini.example infra/docker/certbot/cloudflare.ini
chmod 600 infra/docker/certbot/cloudflare.ini
# Edit cloudflare.ini — paste Cloudflare API token (Zone:DNS:Edit permission required)

bash infra/docker/certbot/init-letsencrypt.sh staging
```

**Step 3 — Start services**

```bash
cd infra/docker
docker compose -f compose.staging.yml up -d
```

> **SSL bootstrap order matters.** Nginx reads the certificate on startup. If the cert doesn't exist yet, nginx refuses to start. Always run Step 2 before Step 3. If you accidentally ran `docker compose up` first, fix it with:
> ```bash
> docker compose -f compose.staging.yml down
> bash certbot/init-letsencrypt.sh staging
> docker compose -f compose.staging.yml up -d
> ```

After initial issuance, the certbot container renews automatically every 12 hours.

---

### Production

Identical flow to staging, but uses a real Let's Encrypt certificate and the production compose file.

**Step 1 — Environment variables**

```bash
cp infra/docker/.env.prod.example infra/docker/.env
# Edit infra/docker/.env — use production values
```

**Step 2 — SSL certificate (first deploy only)**

```bash
cp infra/docker/certbot/cloudflare.ini.example infra/docker/certbot/cloudflare.ini
chmod 600 infra/docker/certbot/cloudflare.ini
# Edit cloudflare.ini

bash infra/docker/certbot/init-letsencrypt.sh prod
```

**Step 3 — Start services**

```bash
cd infra/docker
docker compose -f compose.prod.yml up -d
```

---

## RBAC Model

```
User ──has many──▶ Role ──has many──▶ Permission
                                       (resource:action)
```

Permissions format: `users:create`, `users:read`, `roles:list`, `permissions:list`, etc.

---

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

---

## Logs

```bash
# Run from infra/docker/
docker compose -f infra/docker/compose.__env__.yml logs -f           # all services
docker compose -f infra/docker/compose.__env__.yml logs -f web
docker compose -f infra/docker/compose.__env__.yml logs -f api
docker compose -f infra/docker/compose.__env__.yml logs -f postgres
docker compose -f infra/docker/compose.__env__.yml logs -f api web   # multiple
```

For production log queries, alerting setup, and incident playbooks see [docs/ops-manual.md](docs/ops-manual.md).
