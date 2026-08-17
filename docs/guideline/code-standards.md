# 📚 Code Standards Overview

## Table of Contents
1. [Clean Code & OOP Principles](#clean-code--oop-principles)
2. [Naming Conventions](#naming-conventions)
3. [Folder Structure](#folder-structure)
4. [Cross‑Layer Boundary Enforcement](#cross-layer-boundary-enforcement)
5. [Quick Reference for Adding Features](#quick-reference)

## Clean Code & OOP Principles
- **Single Responsibility** – a class/module should have one reason to change.
- **Open/Closed** – open for extension, closed for modification.
- **Liskov Substitution** – derived classes must interoperate with base types.
- **Dependency Inversion** – depend on abstractions, not on concretions.
- **DRY** – eliminate duplication. Prefer small, reusable functions.

## Naming Conventions
| Category | Case | Example |
|----------|------|---------|
| Class / Service | PascalCase | `UserService` |
| Constant | UPPER_SNAKE_CASE | `MAX_RETRY` |
| Variable / Function | camelCase | `fetchUsers()` |

Always add type annotations in TypeScript, and use JSDoc for public APIs.

## Folder Structure
### `apps/api`
```
src/
├── api/            # Express/Nest router definitions
├── modules/        # Feature modules (CRUD, auth, etc.)
│   ├── users/          # Entity, DTO, controller, service, repository
│   └── ...
├── entities/      # Domain entities & value objects
├── repositories/  # Data access abstractions
└── utils/         # Shared helpers / validators
```
### `apps/web`
```
src/
├── components/    # Reusable UI components
├── pages/         # Next.js page files
├── store/         # Redux / Zustand stores
├── api/           # API wrappers (e.g., useAxios hooks)
└── utils/         # Shared utilities
```
The layout follows the trend from the recent web‑search guideline: feature‑first modules, minimal cross‑layer coupling, and a clear separation of domain vs. infrastructure.

## Cross‑Layer Boundary Enforcement
1. **ESLint Boundaries** – use `@eslint/best-practices` + custom plugins to forbid imports outside declared boundaries (`src/services/* -> src/repositories/*`, but not the reverse).
2. **Dependency Injection** – services receive repositories via constructor; use `tsyringe`/`inversify` for obvious DI.
3. **No Direct Infra Imports** – domain layer (entities, use‑case services) must never `require` or `import` a database, cache, or any framework‑specific module.
   - Infra adapters (e.g., Prisma repository) live in `applications/adapters` and are wired in a composition root.
4. **Layer‑Aware Testing** – unit tests should target a single layer; integration tests combine adjacent layers.

## Quick Reference for Adding a New Feature
1. **Create Feature Module** – `apps/api/src/modules/<feature>`.
2. **Add Entity & DTOs** – under `entities` and `dto` folders.
3. **Write Repository Interface** – in `repositories`.
4. **Implement Service** – in `services`, inject repository via DI.
5. **Create Controller / Route** – in `api` or `modules/<feature>`.
6. **Write Unit Tests** – `__tests__` under each folder.
7. **Add Documentation** – brief comment in README and update docs if needed.
8. **Merge & Deploy** – follow existing PR workflow.

---
> **Tip**: Keep commits focused per feature and run `npm run lint` and `npm run test` before merging.
