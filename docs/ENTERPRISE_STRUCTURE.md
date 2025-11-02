# Enterprise-Level Folder Structure

This document outlines the enterprise-level folder structure for the Pandora application, following industry best practices for scalability, maintainability, and team collaboration.

## 📁 Directory Structure

```
pandora/
├── app/                          # Next.js App Router (presentation layer)
│   ├── (auth)/                  # Auth route group
│   │   ├── login/
│   │   └── signup/
│   ├── (protected)/             # Protected route group
│   │   ├── dashboard/
│   │   ├── products/
│   │   ├── events/
│   │   ├── suppliers/
│   │   ├── contracts/
│   │   └── audit-logs/
│   ├── api/                     # API routes (if needed)
│   │   └── v1/
│   ├── auth/
│   └── layout.tsx
│
├── components/                   # React components (UI layer)
│   ├── ui/                      # Base UI components (shadcn/ui)
│   ├── reusable/                # Reusable shared components
│   │   ├── data-table/
│   │   ├── forms/
│   │   └── layouts/
│   └── [domain]/                # Domain-specific components
│       ├── products/
│       ├── events/
│       ├── suppliers/
│       └── contracts/
│
├── lib/                          # Business logic & infrastructure
│   ├── types/                   # TypeScript type definitions
│   │   ├── index.ts             # Main types export
│   │   ├── database.ts          # Database entity types
│   │   ├── api.ts               # API types
│   │   └── common.ts            # Common utility types
│   │
│   ├── constants/               # Application constants
│   │   └── index.ts             # Routes, config, error codes, etc.
│   │
│   ├── config/                  # Configuration management
│   │   └── env.ts               # Environment variables
│   │
│   ├── errors/                  # Error handling
│   │   └── index.ts             # Error classes & utilities
│   │
│   ├── middleware/               # Cross-cutting concerns
│   │   ├── index.ts
│   │   ├── auth.ts              # Authentication middleware
│   │   ├── logging.ts           # Logging utilities
│   │   └── validation.ts       # Validation middleware
│   │
│   ├── utils/                   # Utility functions
│   │   ├── index.ts             # Main utils export
│   │   ├── cn.ts                # Class name utility
│   │   ├── format.ts            # Formatting utilities
│   │   ├── validation.ts        # Validation helpers
│   │   ├── date.ts              # Date utilities
│   │   ├── array.ts             # Array utilities
│   │   └── object.ts             # Object utilities
│   │
│   ├── actions/                 # Server actions (Next.js)
│   │   ├── products.ts
│   │   ├── events.ts
│   │   ├── suppliers.ts
│   │   └── contracts.ts
│   │
│   ├── data/                    # Data access layer
│   │   ├── products.ts
│   │   ├── events.ts
│   │   ├── suppliers.ts
│   │   └── contracts.ts
│   │
│   ├── hooks/                   # React hooks
│   │   ├── use-mobile.ts
│   │   ├── use-user.tsx
│   │   └── use-upload-event-image.ts
│   │
│   ├── providers/               # React context providers
│   │   └── query-provider.tsx
│   │
│   ├── supabase/                # Supabase client configuration
│   │   ├── client.ts            # Client-side client
│   │   ├── server.ts            # Server-side client
│   │   └── middleware.ts        # Middleware utilities
│   │
│   ├── auth/                    # Authentication utilities
│   │   └── session.ts
│   │
│   ├── [domain]/                # Domain-specific modules
│   │   ├── products/
│   │   │   └── schema.ts
│   │   ├── contracts/
│   │   │   └── schema.ts
│   │   └── suppliers/
│   │       ├── schema.ts
│   │       └── utils.ts
│   │
│   └── validators/              # Zod validation schemas
│       └── event.ts
│
├── __tests__/                   # Test files
│   ├── setup.ts                 # Test configuration
│   ├── unit/                    # Unit tests
│   │   ├── utils/
│   │   ├── components/
│   │   └── lib/
│   ├── integration/             # Integration tests
│   ├── e2e/                      # End-to-end tests
│   └── helpers/                  # Test utilities
│       └── test-helpers.ts
│
├── db/                           # Database
│   ├── migrations/              # Database migrations
│   ├── tables/                  # Table definitions
│   ├── policies/                # RLS policies
│   ├── triggers/                # Database triggers
│   └── seeds/                   # Seed data
│
├── docs/                         # Documentation
│   ├── ENTERPRISE_STRUCTURE.md  # This file
│   ├── folder-structure-improvements.md
│   └── [domain]/                # Domain-specific docs
│
├── public/                       # Static assets
├── scripts/                      # Utility scripts
├── .env.example                 # Environment variables template
├── vitest.config.ts             # Test configuration
└── tsconfig.json                # TypeScript configuration
```

## 🏗️ Architecture Layers

### 1. Presentation Layer (`app/`, `components/`)
- **Responsibility**: User interface and routing
- **Components**: React components, pages, layouts
- **Rules**: No business logic, minimal state management

### 2. Application Layer (`lib/actions/`)
- **Responsibility**: Application use cases and workflows
- **Pattern**: Server Actions (Next.js)
- **Rules**: Orchestrates domain logic, handles transactions

### 3. Domain Layer (`lib/[domain]/`)
- **Responsibility**: Business logic and domain models
- **Components**: Domain schemas, validators, business rules
- **Rules**: Domain-specific logic, no framework dependencies

### 4. Data Access Layer (`lib/data/`)
- **Responsibility**: Data fetching and persistence
- **Components**: Supabase queries, data transformations
- **Rules**: Database-specific logic, query optimization

### 5. Infrastructure Layer (`lib/config/`, `lib/middleware/`, `lib/utils/`)
- **Responsibility**: Cross-cutting concerns
- **Components**: Configuration, logging, utilities, errors
- **Rules**: Framework-agnostic, reusable across layers

## 📦 Module Organization

### Domain-Driven Structure
Each domain module contains:
- **Schema**: Zod validation schemas
- **Types**: TypeScript interfaces (imported from `lib/types/`)
- **Actions**: Server actions for the domain
- **Data**: Data access functions
- **Components**: Domain-specific UI components
- **Utils**: Domain-specific utilities (if needed)

Example:
```
lib/
└── products/
    ├── schema.ts          # Zod schemas
    └── [types imported from lib/types/database.ts]

components/
└── products/
    ├── product-form.tsx
    └── product-table.tsx

app/(protected)/
└── products/
    ├── page.tsx
    └── [id]/
        └── page.tsx
```

## 🔧 Key Infrastructure Components

### Types (`lib/types/`)
Centralized type definitions:
- `database.ts`: Database entity types
- `api.ts`: API request/response types
- `common.ts`: Shared utility types
- `index.ts`: Main export point

### Constants (`lib/constants/`)
- Route paths
- Configuration values
- Error codes
- Business rules
- Success/error messages

### Configuration (`lib/config/`)
- Environment variable management
- Type-safe configuration access
- Feature flags

### Error Handling (`lib/errors/`)
- Standardized error classes
- Error utilities
- Error formatting for client

### Middleware (`lib/middleware/`)
- Authentication helpers
- Logging utilities
- Validation middleware

### Utils (`lib/utils/`)
Categorized utilities:
- Formatting (`format.ts`)
- Validation (`validation.ts`)
- Date operations (`date.ts`)
- Array/Object manipulation (`array.ts`, `object.ts`)

## 🧪 Testing Structure

### Unit Tests (`__tests__/unit/`)
- Test individual functions/components
- Fast execution
- Isolated from external dependencies

### Integration Tests (`__tests__/integration/`)
- Test module interactions
- Database/API integration
- End-to-end workflows

### E2E Tests (`__tests__/e2e/`)
- Full user journeys
- Browser automation
- Production-like scenarios

## 📋 Best Practices

### Import Organization
1. External dependencies
2. Internal utilities (`@/lib/utils`)
3. Types (`@/lib/types`)
4. Components (`@/components`)
5. Relative imports

### File Naming
- Components: `kebab-case.tsx`
- Utilities: `kebab-case.ts`
- Types: `PascalCase` interfaces/types
- Constants: `UPPER_SNAKE_CASE`

### Code Organization
- One primary export per file (with named exports for utilities)
- Group related functions
- Document complex logic
- Keep functions focused and small

### Error Handling
- Use custom error classes from `lib/errors`
- Handle errors at appropriate layer
- Log errors with context
- Return user-friendly messages

### Type Safety
- Use TypeScript strictly
- Define types in `lib/types/`
- Avoid `any` type
- Use Zod for runtime validation

## 🚀 Migration Guide

If you're migrating existing code:

1. **Move types** to `lib/types/` domain files
2. **Extract constants** to `lib/constants/`
3. **Update error handling** to use `lib/errors/`
4. **Refactor utils** to categorized files
5. **Organize by domain** where possible
6. **Add tests** following the test structure

## 📚 Additional Resources

- [Next.js App Router Docs](https://nextjs.org/docs/app)
- [TypeScript Best Practices](https://typescript-eslint.io/rules/)
- [Domain-Driven Design](https://martinfowler.com/bliki/DomainDrivenDesign.html)
- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)

