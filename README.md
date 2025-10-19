# SaaS Dashboard

A full-stack SaaS analytics platform built with modern web technologies. Track and visualize key metrics like MRR, active users, and churn rate with an interactive dashboard.

## Architecture

This is a monorepo containing:

- **`apps/api`** - NestJS REST API backend with PostgreSQL
- **`apps/web`** - Next.js 15 frontend with Material-UI and Redux

## Tech Stack

### Backend (API)
- **Framework**: NestJS 11
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT with refresh tokens (HttpOnly cookies)
- **Authorization**: Role-Based Access Control (RBAC)
- **Validation**: class-validator with DTOs
- **Testing**: Jest with 100% coverage requirement

### Frontend (Web)
- **Framework**: Next.js 15 (App Router)
- **UI Library**: Material-UI v7
- **State Management**: Redux Toolkit + RTK Query
- **Charts**: Recharts
- **Language**: TypeScript (strict mode)

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm, yarn, or pnpm

### 1. Clone and Install

```bash
git clone <repository-url>
cd saas-dashboard
npm install
```

### 2. Set Up Environment Variables

#### API (`apps/api/.env`)
```env
DATABASE_URL="postgresql://user:password@localhost:5432/saas_dashboard"
JWT_ACCESS_SECRET="your-access-secret-here"
JWT_REFRESH_SECRET="your-refresh-secret-here"
FRONTEND_URL="http://localhost:3000"
RESEND_API_KEY="re_your_api_key_here"
PORT=3001
```

#### Web (`apps/web/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_DEFAULT_PROJECT_ID=your-project-id
```

### 3. Set Up Database

```bash
cd apps/api
npx prisma migrate dev
npx prisma db seed  # Optional: seed with sample data
```

### 4. Start Development Servers

From the monorepo root:

```bash
npm run dev
```

This starts both applications concurrently:
- **Web**: http://localhost:3000
- **API**: http://localhost:3001

Or run individually:

```bash
# API only
npm run dev --workspace=apps/api

# Web only
npm run dev --workspace=apps/web
```

## Project Structure

```
saas-dashboard/
├── apps/
│   ├── api/                    # NestJS backend
│   │   ├── src/
│   │   │   ├── auth/           # Authentication module (JWT, RBAC)
│   │   │   ├── users/          # User management
│   │   │   ├── teams/          # Team & project management
│   │   │   ├── analytics/      # Analytics endpoints
│   │   │   └── prisma/         # Prisma schema & migrations
│   │   ├── test/               # E2E tests
│   │   └── README.md           # API documentation
│   │
│   └── web/                    # Next.js frontend
│       ├── src/
│       │   ├── app/            # App Router pages
│       │   │   ├── (protected)/ # Protected routes
│       │   │   ├── login/      # Login page
│       │   │   └── register/   # Registration page
│       │   ├── components/     # React components
│       │   ├── state/          # Redux store & RTK Query
│       │   └── lib/            # Utilities
│       └── README.md           # Web documentation
│
├── packages/                   # Shared packages (if any)
├── package.json                # Workspace configuration
└── docker-compose.yml          # PostgreSQL setup
```

## Available Scripts

### Monorepo Root

```bash
# Start both API and Web in development mode
npm run dev

# Build all workspaces
npm run build

# Lint all workspaces
npm run lint

# Test all workspaces
npm run test
```

### API Workspace

```bash
# Development with hot reload
npm run dev --workspace=apps/api

# Build for production
npm run build --workspace=apps/api

# Start production server
npm start --workspace=apps/api

# Run tests with coverage
npm test --workspace=apps/api

# Database migrations
cd apps/api
npx prisma migrate dev
npx prisma studio  # Database GUI
```

### Web Workspace

```bash
# Development with Turbopack
npm run dev --workspace=apps/web

# Build for production
npm run build --workspace=apps/web

# Start production server
npm start --workspace=apps/web

# Lint
npm run lint --workspace=apps/web
```

## Features

### Authentication & Authorization
- ✅ JWT-based authentication with access & refresh tokens
- ✅ HttpOnly cookies for secure token storage
- ✅ Role-Based Access Control (RBAC)
- ✅ User registration and login
- ✅ Email verification on registration
- ✅ Password reset functionality
- ✅ Automatic token refresh
- ✅ Protected routes with auth guards
- ✅ Email service integration (Resend)

### Analytics Dashboard
- ✅ Interactive charts with Recharts
- ✅ Monthly Recurring Revenue (MRR) tracking
- ✅ Active users monitoring
- ✅ Churn rate calculation
- ✅ Date range filtering (7, 30, 90 days + custom)
- ✅ Interval selection (day, week, month)
- ✅ Team and project switching
- ✅ Real-time data updates

### API Endpoints

**Authentication** (`/v1/auth`)
- `POST /login` - User login
- `POST /register` - User registration (sends verification email)
- `POST /refresh` - Refresh access token
- `POST /logout` - User logout
- `GET /me` - Get current user
- `GET /verify-email` - Verify email address
- `POST /resend-verification` - Resend verification email
- `POST /forgot-password` - Request password reset
- `POST /reset-password` - Reset password with token

**Teams & Projects** (`/v1/teams`)
- `GET /mine` - Get user's teams
- `GET /:teamId/projects` - Get team projects
- `POST /` - Create team
- `POST /:teamId/projects` - Create project

**Analytics** (`/v1/analytics/:projectId`)
- `GET /mrr` - Monthly Recurring Revenue
- `GET /active-users` - Active user count
- `GET /churn` - Churn rate percentage

All endpoints support query parameters: `?from=YYYY-MM-DD&to=YYYY-MM-DD&interval=day|week|month`

## Development Workflow

### Adding a New Feature

1. **Backend** (if API changes needed):
   ```bash
   cd apps/api
   # Create module, controller, service
   nest g module feature
   nest g controller feature
   nest g service feature
   # Add tests
   npm test
   ```

2. **Frontend**:
   ```bash
   cd apps/web
   # Add RTK Query endpoint in src/state/services/
   # Create component in src/components/
   # Add route in src/app/
   # Run type checks
   npx tsc --noEmit
   ```

3. **Commit**:
   ```bash
   git add .
   git commit -m "Added feature X"
   ```

### Running Tests

```bash
# API tests (Jest + Supertest)
npm test --workspace=apps/api

# API tests with coverage (current: 83.03%)
npm run test:cov --workspace=apps/api

# API E2E tests (51 integration tests)
npm run test:e2e --workspace=apps/api
```

**Test Coverage:**
- **Unit Tests**: 127 passing tests across 17 suites
- **E2E Tests**: 51 integration tests (auth, teams, projects, ingest, analytics)
- **Coverage**: 83.03% overall
- **Test Types**: Controllers, services, guards, and full API workflows

### Code Quality

- **TypeScript**: Strict mode enabled, no `any` types allowed
- **Linting**: ESLint with recommended rules (all files passing)
- **Testing**: 83.03% code coverage on API with comprehensive E2E tests
- **Documentation**: Comprehensive README files for each app
- **Type Safety**: All test files properly typed without `any` types

## Deployment

### Using Docker

```bash
# Start PostgreSQL
docker-compose up -d

# Build API
cd apps/api
npm run build

# Build Web
cd apps/web
npm run build

# Start production servers
npm start --workspace=apps/api
npm start --workspace=apps/web
```

### Environment Variables (Production)

**API:**
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_ACCESS_SECRET` - Secret for access tokens
- `JWT_REFRESH_SECRET` - Secret for refresh tokens
- `FRONTEND_URL` - Frontend URL for CORS and email links
- `RESEND_API_KEY` - Resend API key for sending emails
- `PORT` - API port (default: 3001)

**Web:**
- `NEXT_PUBLIC_API_URL` - Backend API URL
- `NEXT_PUBLIC_DEFAULT_PROJECT_ID` - Default project ID

## Documentation

- **API Documentation**: See `apps/api/README.md` and `apps/api/DEVELOPER_GUIDE.md`
- **Web Documentation**: See `apps/web/README.md`

## Database Schema

Key entities:
- **Users** - Application users with email/password auth
- **Teams** - Organizations containing multiple projects
- **Projects** - Individual SaaS products with API keys
- **UserTeams** - Many-to-many relationship with roles (OWNER, ADMIN, MEMBER)

See `apps/api/prisma/schema.prisma` for full schema.

## API Testing

```bash
# Register a user
curl -X POST http://localhost:3001/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123","name":"Test User"}'

# Login
curl -X POST http://localhost:3001/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}' \
  -c cookies.txt

# Get analytics (with auth cookie)
curl http://localhost:3001/v1/analytics/PROJECT_ID/mrr?interval=month \
  -b cookies.txt
```

## Troubleshooting

### Database Connection Issues
```bash
# Check PostgreSQL is running
docker ps

# Reset database
cd apps/api
npx prisma migrate reset
```

### Port Conflicts
- API default: 3001
- Web default: 3000
- Change in respective .env files

### CORS Errors
- Ensure `FRONTEND_URL` in API .env matches web app URL
- Check CORS configuration in `apps/api/src/main.ts`

## Contributing

1. Create a feature branch
2. Make your changes with tests
3. Ensure all tests pass and coverage is 100% (API)
4. Run `npm run lint` to check code style
5. Create a pull request

## License

UNLICENSED - Private project
