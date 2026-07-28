# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a modern web platform built using a monorepo architecture with Turborepo, consisting of:
- **API Layer**: NestJS backend with TypeScript, PostgreSQL database via Prisma ORM, Redis for caching and token management
- **Frontend Layer**: Next.js frontend with React, Tailwind CSS, and TypeScript
- **Infrastructure**: Docker-based deployment with Nginx reverse proxy, monitoring (Prometheus + Grafana + ELK), and Let's Encrypt SSL certificates

## Architecture

### High-Level Components
```
Internet → Nginx (80/443) → Web (Next.js :3000) / API (NestJS :3001)
                          │
                          ├── PostgreSQL :5432 (Main DB)
                          └── Redis :6379 (Cache / Token Blacklist)
```

### Core Technologies
- **Backend**: NestJS with TypeScript, JWT authentication, Passport.js for auth strategies
- **Frontend**: Next.js with React, Tailwind CSS, Socket.io client
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT + Refresh tokens + 2FA (TOTP)
- **Authorization**: Role-Based Access Control (RBAC) system
- **Caching**: Redis for session management and token blacklisting
- **Real-time**: Socket.io for WebSocket connections

### Key Features Implemented
1. User authentication with email/password
2. Two-factor authentication (TOTP)
3. Role-based access control (RBAC)
4. Token management with refresh tokens and blacklist
5. Real-time communication via WebSocket
6. Audit logging
7. Database migrations and seeding
8. Monitoring with Prometheus and Grafana

## Development Environment Setup

### Prerequisites
- Node.js >= 22.0.0
- npm >= 10.0.0
- Docker (for development environment)

### Commands
```bash
# Install dependencies
npm install

# Start development servers (both API and Web)
npm run dev

# Build all apps
npm run build

# Run tests
npm run test

# Lint code
npm run lint

# Database operations
npm run db:generate    # Generate Prisma client
npm run db:migrate     # Run migrations
npm run db:seed        # Seed database with initial data

# Format code
npm run format
```

### Environment Configuration
- `.env.local` and `.env` files are loaded by NestJS ConfigModule
- Secrets should never be committed to the repository
- Environment-specific Docker compose files in `infra/docker/`

## Development Workflow

1. **Start development**: Run `npm run dev` to start both API and Web servers
2. **API Development**: Work in `/apps/api/src/` - authentication, users, RBAC, etc.
3. **Frontend Development**: Work in `/apps/web/src/` - components, pages, styling
4. **Database Changes**: Modify Prisma schema in `packages/database/prisma/schema.prisma`, then run migrations
5. **Testing**: Tests are located in corresponding apps (`apps/api/test/`, `apps/web/src/`)

## Authentication & Authorization

The platform implements a comprehensive authentication system:
- Local authentication with email/password
- JWT-based access tokens (15 minutes expiry)
- Refresh tokens with 7-day expiry
- Two-factor authentication (TOTP) support
- Role-based access control (RBAC) system
- Token blacklisting for logout functionality
- Audit logging of user activities

## Key Implementation Details

### API Layer (`apps/api`)
- Uses NestJS modules architecture with proper separation of concerns
- Authentication via local and JWT strategies
- RBAC system with permissions and roles
- Redis integration for caching and token management
- WebSocket gateway for real-time communication

### Frontend Layer (`apps/web`)
- Next.js application with React
- Tailwind CSS for styling
- Socket.io client integration
- Responsive design patterns
- TypeScript type safety throughout

### Database (`packages/database`)
- Prisma ORM with PostgreSQL
- Schema includes users, roles, permissions, user_roles, refresh_tokens, audit_logs
- Migration support via Prisma
- Seeding functionality

## Testing Strategy

Tests are organized by application:
- API tests in `apps/api/test/`
- Web component tests in `apps/web/src/`
- Unit and integration tests follow NestJS conventions
- E2E tests for API endpoints

## Monitoring & Operations

The platform includes comprehensive monitoring:
- Prometheus for metrics collection
- Grafana dashboards for system health
- ELK stack (Elasticsearch, Logstash, Kibana) for log aggregation
- Docker compose based deployment with separate environments
- Automated backup scripts in `scripts/backup-db.sh`
- Let's Encrypt SSL certificate management

## Common Development Tasks

1. **Adding new API endpoints**: Create controller in `/apps/api/src/` and register it in the appropriate module
2. **Creating new database models**: Modify Prisma schema, run migrations, update service logic
3. **Implementing new features**: Follow existing patterns for authentication, RBAC, and error handling
4. **Adding UI components**: Create React components in `/apps/web/src/`
5. **Modifying auth flows**: Update strategies in `apps/api/src/auth/strategies/`
6. **Database migrations**: Use Prisma CLI with `npm run db:migrate`

## Code Organization

### Monorepo Structure
```
apps/
├── api/           # NestJS backend
│   ├── src/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── rbac/
│   │   ├── gateway/
│   │   └── prisma/
│   └── test/
├── web/           # Next.js frontend
│   └── src/
└── packages/
    └── database/  # Prisma schema and client
```

### Key Files to Understand
- `apps/api/src/app.module.ts` - Main application module
- `apps/api/src/auth/auth.module.ts` - Authentication module
- `apps/api/src/users/users.service.ts` - User operations
- `apps/web/src/lib/socket.ts` - WebSocket connection management
- `packages/database/prisma/schema.prisma` - Database schema
- `docs/ops-manual.md` - Operations and maintenance guide