# Contributing Guide

Thank you for your interest in contributing to Pandora! This guide will help you get started.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Git
- Access to the development database (or Supabase CLI)

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd pandora
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

## 📁 Project Structure

See [docs/ENTERPRISE_STRUCTURE.md](./docs/ENTERPRISE_STRUCTURE.md) for detailed architecture documentation.

Key directories:
- `app/` - Next.js routes and pages
- `components/` - React components
- `lib/` - Business logic and utilities
- `db/` - Database schemas and migrations
- `__tests__/` - Test files

## 🔧 Development Workflow

### Branch Naming

- `feature/description` - New features
- `fix/description` - Bug fixes
- `refactor/description` - Code refactoring
- `docs/description` - Documentation updates

### Commit Messages

Follow conventional commits:
```
feat: add product search functionality
fix: resolve authentication token expiration
docs: update API documentation
refactor: reorganize utility functions
```

### Code Style

- Use TypeScript strictly (no `any` types)
- Follow ESLint rules
- Run `npm run lint:fix` before committing
- Run `npm run type-check` to verify types

## 🧪 Testing

### Running Tests

```bash
npm test              # Run tests once
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

### Writing Tests

- Unit tests: `__tests__/unit/`
- Integration tests: `__tests__/integration/`
- E2E tests: `__tests__/e2e/`

## 📝 Code Review Process

1. Create a feature branch
2. Make your changes
3. Write/update tests
4. Run linting and type checking
5. Submit a pull request
6. Address review feedback

## 🐛 Reporting Issues

When reporting bugs, please include:
- Description of the issue
- Steps to reproduce
- Expected behavior
- Actual behavior
- Environment details (OS, Node version, etc.)

## 💡 Feature Requests

For new features:
- Describe the use case
- Explain the proposed solution
- Consider alternatives
- Submit an issue first for discussion

## 📚 Resources

- [Enterprise Structure Guide](./docs/ENTERPRISE_STRUCTURE.md)
- [Folder Structure Analysis](./docs/folder-structure-improvements.md)
- [Next.js Documentation](https://nextjs.org/docs)

## 🙏 Thank You!

Your contributions make this project better for everyone!

