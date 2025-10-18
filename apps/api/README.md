# SaaS Dashboard API

A robust NestJS-based REST API for a multi-tenant SaaS platform with team management, project organization, and role-based access control (RBAC).

## Features

- **Authentication & Authorization**
  - JWT-based authentication with access and refresh tokens
  - HttpOnly cookies for secure refresh token storage
  - Role-based access control (OWNER, ADMIN, MEMBER)

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
  - Interactive API explorer

## Tech Stack

- **Framework**: NestJS
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT (jsonwebtoken, passport-jwt)
- **Validation**: Zod
- **Documentation**: Swagger/OpenAPI
- **Password Hashing**: bcrypt

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
```

### 3. Database Setup

```bash
# Generate Prisma client
npm run prisma:generate

# Run database migrations
npx prisma migrate dev

# (Optional) Seed the database
npx prisma db seed
```

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

### Authentication
- `POST /v1/auth/register` - Register new user
- `POST /v1/auth/login` - Login user
- `POST /v1/auth/refresh` - Refresh access token
- `POST /v1/auth/logout` - Logout user (clears refresh token)
- `GET /v1/auth/me` - Get current user info

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

The ingest endpoint uses **API key authentication** (not JWT). Include the project API key in the `x-api-key` header. You can get the API key from:
1. Creating a new project (returns API key)
2. Rotating the API key via `/v1/teams/:teamId/projects/:projectId/rotate-key`

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
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

### Database Management

```bash
# Create a new migration
npx prisma migrate dev --name your_migration_name

# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Open Prisma Studio (database GUI)
npx prisma studio
```

### Code Quality

```bash
# Lint code
npm run lint

# Format code
npm run format
```

## Security Considerations

- **Access tokens** are short-lived (15 minutes by default)
- **Refresh tokens** are stored in HttpOnly cookies (cannot be accessed via JavaScript)
- **Passwords** are hashed using bcrypt
- **CORS** is configured for trusted origins only
- **Input validation** using Zod schemas
- **SQL injection protection** via Prisma ORM

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Server port | `3001` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/db` |
| `JWT_ACCESS_SECRET` | Secret for signing access tokens | `random-secret-key` |
| `JWT_REFRESH_SECRET` | Secret for signing refresh tokens | `another-random-secret` |
| `JWT_ACCESS_EXPIRES` | Access token lifetime (seconds) | `900` (15 min) |
| `JWT_REFRESH_EXPIRES` | Refresh token lifetime (seconds) | `604800` (7 days) |

## Common Issues

### Database Connection Error
- Ensure PostgreSQL is running
- Verify `DATABASE_URL` is correct
- Check database exists and user has permissions

### JWT Token Invalid
- Verify `JWT_ACCESS_SECRET` matches between requests
- Check token hasn't expired
- Ensure token is sent in `Authorization: Bearer <token>` format

### CORS Errors
- Update allowed origins in `src/main.ts`
- Ensure credentials are included in requests

## License

UNLICENSED - Private project
