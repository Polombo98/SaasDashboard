# SaaS Dashboard API

A robust NestJS-based REST API for a multi-tenant SaaS platform with team management, project organization, and role-based access control (RBAC).

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [API Documentation](#api-documentation)
- [Authentication](#authentication)
- [API Endpoints](#api-endpoints)
- [Metric Event Ingestion](#metric-event-ingestion)
- [Analytics & Reporting](#analytics--reporting)
- [Role-Based Access Control](#role-based-access-control)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [Development](#development)
- [Security Considerations](#security-considerations)
- [Rate Limiting](#rate-limiting)
- [Common Issues](#common-issues)

## Features

- **Authentication & Authorization**
  - JWT-based authentication with access and refresh tokens
  - HttpOnly cookies for secure refresh token storage
  - Role-based access control (OWNER, ADMIN, MEMBER)
  - Email verification with secure tokens
  - Password reset functionality
  - Email service integration (Resend)

- **Team Management**
  - Create and manage teams
  - Invite members with different roles
  - Team-scoped project organization

- **Project Management**
  - Create projects within teams
  - Generate and rotate API keys
  - Role-based project access

- **Metrics & Analytics Ingestion**
  - Track revenue, signups, subscriptions, and user activity
  - Batch event processing (up to 500 events per request)
  - Idempotent event ingestion with deduplication
  - API key-based authentication for client applications

- **API Documentation**
  - Auto-generated Swagger/OpenAPI documentation
  - Interactive API explorer at `/docs`

- **Rate Limiting & Throttling**
  - Global request throttling (600 req/min)
  - IP-based rate limiting

- **Email Notifications**
  - Email verification on registration
  - Password reset emails
  - Branded HTML email templates

## Tech Stack

- **Framework**: NestJS
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT (jsonwebtoken, passport-jwt)
- **Validation**: Zod schemas
- **Documentation**: Swagger/OpenAPI (@nestjs/swagger)
- **Password Hashing**: bcrypt
- **Rate Limiting**: @nestjs/throttler
- **Testing**: Jest with ts-jest

## Prerequisites

- Node.js 18+
- PostgreSQL database
- npm or yarn

## Getting Started

### 1. Installation

```bash
npm install
```

### 2. Environment Configuration

Create a `.env` file in the root directory with the following variables:

```env
# Server
PORT=3001

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/saas_db"

# JWT Secrets
JWT_ACCESS_SECRET=your-access-secret-key-here
JWT_REFRESH_SECRET=your-refresh-secret-key-here

# JWT Expiration (in seconds)
JWT_ACCESS_EXPIRES=900      # 15 minutes
JWT_REFRESH_EXPIRES=604800  # 7 days

# Email Service (Resend)
RESEND_API_KEY=re_your_api_key_here

# Frontend URL (for email links and CORS)
FRONTEND_URL=http://localhost:3000
```

### 3. Database Setup

```bash
# Generate Prisma client
npm run prisma:generate

# Run database migrations
npx prisma migrate dev

# Seed the database with demo data (RECOMMENDED)
npx prisma db seed

# Custom seed options
npx prisma db seed -- --days=60 --users=200 --projects=2

# Reset and reseed database
npx prisma db seed -- --reset --days=90
```

**Seed Script Details:**
- Creates demo owner user (`owner@demo.local` / `Password123`)
- Generates realistic demo team, projects, and users
- Creates metric events over customizable time period
- Default: 1 project, 120 users, 90 days of data, ~3,600 events
- All demo users have `@demo.local` email domain for easy cleanup

### 4. Run the Application

```bash
# Development mode with hot reload
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

The API will be available at `http://localhost:3001`

## API Documentation

Interactive API documentation is available at:

```
http://localhost:3001/docs
```

The Swagger UI provides:
- Complete endpoint documentation
- Request/response schemas
- Try-it-out functionality
- Authentication testing

## Authentication

### Registration

```bash
POST /v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123",
  "name": "John Doe"
}
```

**Response**: Returns access token in body and sets refresh token as HttpOnly cookie

### Login

```bash
POST /v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

### Using the Access Token

Include the access token in the Authorization header:

```bash
Authorization: Bearer <access_token>
```

### Refresh Token

```bash
POST /v1/auth/refresh
```

The refresh token is automatically sent from the HttpOnly cookie. Returns a new access token.

## API Endpoints

### Health Check
- `GET /v1/health` - Check API status and availability

**Response:**
```json
{
  "ok": true,
  "service": "api",
  "time": "2025-10-18T12:30:00.000Z"
}
```

### Authentication
- `POST /v1/auth/register` - Register new user (sends verification email)
- `POST /v1/auth/login` - Login user
- `POST /v1/auth/refresh` - Refresh access token
- `POST /v1/auth/logout` - Logout user (clears refresh token)
- `GET /v1/auth/me` - Get current user info
- `GET /v1/auth/verify-email?token=<token>` - Verify email address
- `POST /v1/auth/resend-verification` - Resend verification email
- `POST /v1/auth/forgot-password` - Request password reset email
- `POST /v1/auth/reset-password` - Reset password with token

### Teams
- `POST /v1/teams` - Create a new team (creates user as OWNER)
- `GET /v1/teams/mine` - Get all teams for current user
- `POST /v1/teams/:teamId/members` - Add member to team (OWNER only)

### Projects
- `GET /v1/teams/:teamId/projects` - List team projects (MEMBER+)
- `POST /v1/teams/:teamId/projects` - Create project (ADMIN+)
- `POST /v1/teams/:teamId/projects/:projectId/rotate-key` - Rotate API key (ADMIN+)

### Ingest (Metrics & Analytics)
- `POST /v1/ingest` - Ingest metric events (requires project API key)

### Analytics (Reporting)
- `GET /v1/analytics/:projectId/mrr` - Get Monthly Recurring Revenue time-series (MEMBER+)
- `GET /v1/analytics/:projectId/active-users` - Get active users time-series (MEMBER+)
- `GET /v1/analytics/:projectId/churn` - Get churn rate time-series (MEMBER+)

## Metric Event Ingestion

The ingest endpoint allows you to send analytics and metrics data to your project. This is typically called from your application (frontend or backend) using the project API key.

### Event Types

1. **REVENUE** - Track revenue events
   - Required: `type`, `value`, `occurredAt`
   - Optional: `userId`, `eventId`

2. **ACTIVE** - Track active users
   - Required: `type`, `userId`, `occurredAt`
   - Optional: `value`, `eventId`

3. **SUBSCRIPTION_START** - Track new subscriptions
   - Required: `type`, `userId`, `occurredAt`
   - Optional: `value`, `eventId`

4. **SUBSCRIPTION_CANCEL** - Track subscription cancellations
   - Required: `type`, `userId`, `occurredAt`
   - Optional: `value`, `eventId`

5. **SIGNUP** - Track user signups
   - Required: `type`, `userId`, `occurredAt`
   - Optional: `value`, `eventId`

### Sending Events

```bash
POST /v1/ingest
x-api-key: proj_1a2b3c4d5e6f7g8h9i0j
Content-Type: application/json

[
  {
    "type": "REVENUE",
    "value": 99.99,
    "occurredAt": "2025-10-18T10:30:00Z",
    "userId": "user_123",
    "eventId": "550e8400-e29b-41d4-a716-446655440000"
  },
  {
    "type": "ACTIVE",
    "userId": "user_456",
    "occurredAt": "2025-10-18T11:00:00Z"
  },
  {
    "type": "SIGNUP",
    "userId": "user_789",
    "occurredAt": "2025-10-18T09:00:00Z"
  }
]
```

### Response

```json
{
  "projectId": "cuid123",
  "received": 3,
  "inserted": 3
}
```

### Batch Limits & Idempotency

- **Batch size**: 1-500 events per request
- **Idempotency**: Include `eventId` (UUID) to prevent duplicate events
- **Duplicate handling**: Events with the same `eventId` within a project are automatically skipped

### Authentication

The ingest endpoint uses **API key authentication** (not JWT). Include the project API key in the `x-api-key` header.

**API Key Format**: `proj_<32-character-hex-string>`

You can get the API key from:
1. Creating a new project (returns API key in response)
2. Rotating the API key via `/v1/teams/:teamId/projects/:projectId/rotate-key`

**Security Note**: Keep your API keys secure. They provide direct access to ingest data into your project. Rotate keys immediately if compromised.

## Analytics & Reporting

The analytics endpoints allow you to query aggregated metrics data from your ingested events. All analytics endpoints require JWT authentication and verify that the user is a member of the project's team.

### Query Parameters

All analytics endpoints support the following query parameters:

- `from` (optional) - Start date (ISO 8601 or YYYY-MM-DD). Defaults to 30 days ago.
- `to` (optional) - End date (ISO 8601 or YYYY-MM-DD). Defaults to today.
- `interval` (optional) - Time interval for aggregation: `day`, `week`, or `month`. Defaults to `day`.

### Response Format

All endpoints return data in time-series format:

```json
{
  "labels": ["2025-10-01", "2025-10-02", "2025-10-03"],
  "series": [1250.5, 1375.75, 1500.0]
}
```

### Available Metrics

#### 1. Monthly Recurring Revenue (MRR)

```bash
GET /v1/analytics/:projectId/mrr?from=2025-10-01&to=2025-10-18&interval=day
Authorization: Bearer <access_token>
```

Returns the sum of all REVENUE events aggregated by the specified interval.

#### 2. Active Users

```bash
GET /v1/analytics/:projectId/active-users?from=2025-10-01&to=2025-10-18&interval=day
Authorization: Bearer <access_token>
```

Returns the count of distinct active users (unique `userId` in ACTIVE events) per interval.

#### 3. Churn Rate

```bash
GET /v1/analytics/:projectId/churn?from=2025-10-01&to=2025-10-18&interval=day
Authorization: Bearer <access_token>
```

Returns the churn rate percentage calculated as:
```
churn_rate = (SUBSCRIPTION_CANCEL events / SUBSCRIPTION_START events) * 100
```

### Data Aggregation

- **Time bucketing**: Data is aggregated using PostgreSQL's `date_trunc` function
- **Gap filling**: Missing data points are filled with zeros to ensure continuous series
- **Week intervals**: Weeks start on Monday (ISO 8601 standard)
- **Month intervals**: Months are calendar months (1st to last day)

## Role-Based Access Control

### Roles Hierarchy

1. **OWNER** (highest privilege)
   - Full control over team
   - Can add/remove members
   - Can create/manage projects
   - Can rotate API keys

2. **ADMIN**
   - Can create projects
   - Can rotate API keys
   - Can view team members
   - Cannot manage team membership

3. **MEMBER** (lowest privilege)
   - Can view projects
   - Can view team information
   - Cannot create projects or manage team

### Permission Requirements

| Action | Required Role |
|--------|--------------|
| Create Team | Any authenticated user (becomes OWNER) |
| Add Team Member | OWNER |
| View Team Projects | MEMBER+ |
| Create Project | ADMIN+ |
| Rotate API Key | ADMIN+ |

## Project Structure

```
src/
├── auth/                  # Authentication module
│   ├── auth.controller.ts # Auth endpoints
│   ├── auth.service.ts    # Auth business logic
│   ├── dto.ts             # Auth DTOs and validation
│   └── jwt.guard.ts       # JWT authentication guard
├── teams/                 # Teams module
│   ├── teams.controller.ts
│   ├── teams.service.ts
│   └── dto.ts
├── projects/              # Projects module
│   ├── projects.controller.ts
│   ├── projects.service.ts
│   └── dto.ts
├── ingest/                # Metrics ingestion module
│   ├── ingest.controller.ts
│   ├── ingest.service.ts
│   └── dto.ts
├── analytics/             # Analytics & reporting module
│   ├── analytics.controller.ts
│   ├── analytics.service.ts
│   └── dto.ts
├── common/                # Shared utilities
│   ├── current-user.decorator.ts
│   ├── team-role.guard.ts
│   └── zod-validation.pipe.ts
├── prisma/                # Database module
│   └── prisma.service.ts
├── types/                 # TypeScript types
│   └── JWT.ts
└── main.ts                # Application entry point

prisma/
└── schema.prisma          # Database schema
```

## Database Schema

### User
- Stores user credentials and profile
- One-to-many relationship with Member

### Team
- Team entity with name and metadata
- One-to-many with Members and Projects

### Member
- Junction table for User-Team relationship
- Contains role (OWNER, ADMIN, MEMBER)
- Unique constraint on (userId, teamId)

### Project
- Belongs to a Team
- Contains unique API key
- One-to-many with MetricEvents
- Tracks creation date

### MetricEvent
- Stores analytics and metrics data
- Belongs to a Project
- Event types: REVENUE, ACTIVE, SUBSCRIPTION_START, SUBSCRIPTION_CANCEL, SIGNUP
- Supports idempotency via eventId (unique per project)
- Indexed on (projectId, occurredAt) for efficient queries

## Development

### Running Tests

```bash
# Run all unit tests
npm run test

# Run unit tests with coverage
npm run test:cov

# Run E2E tests
npm run test:e2e

# Watch mode (re-run tests on file changes)
npm run test:watch

# Debug tests
npm run test:debug
```

**Current Test Coverage**: 83.03% (127 passing tests across 17 test suites)

**Test Suites:**
- Unit tests for all controllers, services, and guards
- E2E tests for authentication flow
- E2E tests for teams and projects management
- E2E tests for event ingestion and analytics
- Full test coverage for email verification and password reset

### Database Management

```bash
# Create a new migration
npx prisma migrate dev --name your_migration_name

# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Open Prisma Studio (database GUI)
npx prisma studio

# Seed database with demo data
npx prisma db seed

# Seed with custom parameters
npx prisma db seed -- --days=30 --users=50 --projects=2 --reset
```

**Seed Command Options:**
- `--days=N` - Number of days of historical data (default: 90)
- `--users=N` - Number of users per project (default: 120)
- `--projects=N` - Number of projects to create (default: 1)
- `--reset` - Delete all demo data before seeding (careful!)

**Example Usage:**
```bash
# Quick start with 30 days of data
npx prisma db seed -- --days=30

# Large dataset for testing (180 days, 500 users, 3 projects)
npx prisma db seed -- --days=180 --users=500 --projects=3

# Reset and reseed with fresh data
npx prisma db seed -- --reset
```

**Generated Demo Data:**
- Demo owner: `owner@demo.local` / `Password123`
- Demo team with all users as members
- Projects with unique API keys
- Realistic metric events:
  - REVENUE events (~35% of users with $8-$49/month subscriptions)
  - ACTIVE user events (70% activity for subscribers, 12% for free users)
  - SUBSCRIPTION_START/CANCEL events (~12% churn rate)
  - SIGNUP events (~15% of users)
- All events distributed realistically over the time period

### Code Quality

```bash
# Lint code
npx eslint "src/**/*.ts"

# Lint with auto-fix
npx eslint "src/**/*.ts" --fix

# Type checking
npx tsc --noEmit
```

### NestJS CLI (Code Generation)

```bash
# Generate a new module
nest generate module feature-name

# Generate a controller
nest generate controller feature-name

# Generate a service
nest generate service feature-name

# Generate a complete resource (module, controller, service, DTOs)
nest generate resource feature-name
```

## Security Considerations

- **Access tokens** are short-lived (15 minutes by default)
- **Refresh tokens** are stored in HttpOnly cookies (cannot be accessed via JavaScript)
- **Passwords** are hashed using bcrypt with salt rounds
- **Rate limiting** - Global throttling at 600 requests per 60 seconds (10 req/s per IP)
- **CORS** - Configured for trusted origins (defaults to `http://localhost:3000` for local development)
- **Input validation** using Zod schemas with strict type checking
- **SQL injection protection** via Prisma ORM parameterized queries

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Server port | `3001` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/db` |
| `JWT_ACCESS_SECRET` | Secret for signing access tokens | `random-secret-key` |
| `JWT_REFRESH_SECRET` | Secret for signing refresh tokens | `another-random-secret` |
| `JWT_ACCESS_EXPIRES` | Access token lifetime (seconds) | `900` (15 min) |
| `JWT_REFRESH_EXPIRES` | Refresh token lifetime (seconds) | `604800` (7 days) |
| `RESEND_API_KEY` | Resend API key for sending emails | `re_123abc...` |
| `FRONTEND_URL` | Frontend URL for email links and CORS | `http://localhost:3000` |

## Rate Limiting

The API uses global rate limiting to prevent abuse and ensure fair usage:

- **Limit**: 600 requests per 60 seconds (10 requests per second)
- **Scope**: Per IP address
- **Response**: Returns HTTP 429 (Too Many Requests) when limit is exceeded

### Rate Limit Headers

All responses include rate limit information:
- `X-RateLimit-Limit` - Maximum requests allowed
- `X-RateLimit-Remaining` - Remaining requests in current window
- `X-RateLimit-Reset` - Time when the rate limit resets

### Customizing Rate Limits

To modify rate limits, update `src/app.module.ts`:

```typescript
ThrottlerModule.forRoot([{
  ttl: 60,    // Time window in seconds
  limit: 600  // Max requests per window
}])
```

## Common Issues

### Rate Limit Exceeded
- Wait for the rate limit window to reset (check `X-RateLimit-Reset` header)
- Implement exponential backoff in your client
- Consider caching responses to reduce API calls

### Database Connection Error
- Ensure PostgreSQL is running
- Verify `DATABASE_URL` is correct
- Check database exists and user has permissions

### JWT Token Invalid
- Verify `JWT_ACCESS_SECRET` matches between requests
- Check token hasn't expired
- Ensure token is sent in `Authorization: Bearer <token>` format

### CORS Errors
- **Issue**: Browser blocks requests from your frontend
- **Solution**: Update allowed origins in `src/main.ts`
- **Default config**: `origin: ['http://localhost:3000']` (local development only)
- **Production config**: Add your production domain(s):
  ```typescript
  app.enableCors({
    origin: ['https://yourdomain.com', 'https://app.yourdomain.com'],
    credentials: true
  });
  ```
- Ensure `credentials: true` is set for cookie-based authentication

## License

UNLICENSED - Private project
