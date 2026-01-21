# AarogyaVault Backend

Privacy-first Personal Health Records (PHR) backend API for India, with ABHA alignment and time-bound consent-based sharing.

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL
- **File Storage**: S3-compatible object storage
- **Authentication**: JWT
- **Validation**: Zod

## Project Structure

```
backend/
├── src/
│   ├── modules/          # Feature modules (auth, abha, records, etc.)
│   ├── shared/           # Shared utilities, config, database
│   ├── app.ts            # Express app setup
│   └── server.ts         # Server entry point
├── migrations/           # Database migration files
├── docs/                 # Documentation
└── package.json
```

## Setup

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- S3-compatible storage (or AWS S3)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Set up PostgreSQL database:
```bash
createdb aarogyavault
```

4. Run migrations:
```bash
npm run migrate:up
```

5. Start development server:
```bash
npm run dev
```

The server will start on `http://localhost:3000` (or the port specified in `.env`).

## Environment Variables

See `.env.example` for all required environment variables:

- Database connection settings
- JWT secret and expiry
- S3 storage credentials
- Server port and environment

## Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm run migrate` - Run pending migrations
- `npm run migrate:up` - Run all pending migrations
- `npm run migrate:down` - Rollback last migration
- `npm run migrate:create <name>` - Create a new migration
- `npm run type-check` - Type check without building

## Health Check

The API includes a health check endpoint:

```bash
curl http://localhost:3000/health
```

## Development

### Module Structure

Each module follows a consistent structure:

- `routes.ts` - Express route definitions
- `service.ts` - Business logic
- `types.ts` - Module-specific types
- `validation.ts` - Request validation schemas (Zod)

### Database Migrations

Migrations are managed using `node-pg-migrate`. Create a new migration:

```bash
npm run migrate:create add_users_table
```

Edit the generated migration file in `migrations/` and run:

```bash
npm run migrate:up
```

## Architecture

This is a **modular monolith** - all modules are in the same codebase but organized by feature. This allows for:

- Clear separation of concerns
- Easy code navigation
- Future extraction to microservices if needed (not in MVP scope)

## Security

- All routes require authentication (except health check and public share links)
- JWT tokens for authentication
- Audit logging for all actions
- Time-bound consent for record sharing
- Encryption at rest (S3)
- HTTPS required in production

## Next Steps

This foundation includes:

- ✅ Project structure
- ✅ Database connection
- ✅ Core entity types
- ✅ Module scaffolding
- ✅ Express app setup
- ✅ Schema design documentation

Next phases will implement:

- Authentication (OTP-based login)
- ABHA linking
- Record upload
- OCR processing
- Consent & sharing
- Audit logging

## License

ISC
