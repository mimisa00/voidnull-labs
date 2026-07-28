【# AGENTS.md

## Project Structure

This is a monorepo using Turborepo with:
- `apps/api/` - NestJS backend with TypeScript, PostgreSQL via Prisma, Redis for caching/token management 
- `apps/web/` - Next.js frontend with React, Tailwind CSS
- `packages/database/` - Prisma schema and client
- `infra/docker/` - Docker Compose files for dev/staging/prod environments

## Key Commands

### Development
```bash
# Start all services
npm run dev

# Run tests
npm run test

# Lint code
npm run lint

# Database operations
npm run db:generate    # Generate Prisma client
npm run db:migrate     # Run migrations  
npm run db:seed        # Seed database with initial data
```

### Docker Commands (from infra/docker/)
```bash
# Start services
docker compose -f compose.dev.yml up -d

# View logs
docker compose -f compose.prod.yml logs -f api

# Restart services
docker compose -f compose.prod.yml restart api

# Enter container shells
docker compose -f compose.prod.yml exec api sh
docker compose -f compose.prod.yml exec postgres psql -U $POSTGRES_USER -d $POSTGRES_DB
```

## Architecture Notes

- **Authentication**: JWT access/refresh tokens + 2FA (TOTP)
- **Authorization**: Role-Based Access Control with permissions  
- **Real-time**: Socket.io for WebSocket connections
- **Database**: PostgreSQL with Prisma ORM, migrations in `packages/database/prisma/migrations/`
- **Caching/Token Management**: Redis for session management and token blacklisting

## Environment Setup

For local dev:
1. Copy `.env.dev.example` to `.env` in `infra/docker/`
2. Run `docker compose -f compose.dev.yml up -d` 
3. Run migrations: `npx prisma migrate dev --name init`

For production/staging:
- SSL handled via Let's Encrypt (certbot container)
- Certificates managed by DNS challenges (Cloudflare)
- Environment-specific docker-compose files in `infra/docker/`

## Testing

### Running Individual Tests
```bash
# API tests
cd apps/api
npm run test

# API E2E tests
cd apps/api  
npm run test:e2e

# Frontend tests  
cd apps/web
# Next.js has built-in testing via Jest
```

## Database Operations

- Migrations managed by Prisma in `packages/database/prisma/migrations/`
- Seeds in `packages/database/prisma/seed.ts`
- All DB commands should be run from the `packages/database` directory
- Production migrations use `prisma migrate deploy` (not `prisma migrate dev`)