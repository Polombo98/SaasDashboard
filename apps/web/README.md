# SaaS Dashboard - Web Application

A modern Next.js 15 dashboard application for visualizing SaaS metrics and analytics.

## Features

- **Authentication**: Secure JWT-based authentication with automatic token refresh
- **Dashboard**: Real-time analytics visualization (MRR, Active Users, Churn Rate)
- **State Management**: Redux Toolkit with RTK Query for efficient data fetching
- **UI Components**: Material-UI (MUI) with responsive design
- **Type Safety**: Full TypeScript support throughout the application

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **State Management**: Redux Toolkit + RTK Query
- **UI Library**: Material-UI (MUI) v7
- **Charts**: Recharts (ready to integrate)
- **Validation**: Zod
- **Build Tool**: Turbopack (Next.js default)

## Prerequisites

- Node.js 18+
- npm, yarn, or pnpm
- Running API server (see `apps/api` README)

## Getting Started

### 1. Installation

```bash
npm install
```

### 2. Environment Configuration

Create a `.env.local` file in the root of the web app:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_DEFAULT_PROJECT_ID=your-project-id
```

**Environment Variables:**

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API base URL | `http://localhost:3001` |
| `NEXT_PUBLIC_DEFAULT_PROJECT_ID` | Default project for analytics | `cuid123` |

### 3. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Build for Production

```bash
npm run build
npm start
```

## Project Structure

```
src/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout with providers
│   ├── page.tsx                  # Home page (redirects to login/dashboard)
│   ├── providers.tsx             # Redux Provider + MUI Theme
│   └── _bootstrap.tsx            # Authentication bootstrapper
│
├── login/                        # Login page
│   └── page.tsx                  # Login form with error handling
│
├── (protected)/                  # Protected routes (require auth)
│   ├── layout.tsx                # Auth guard
│   └── dashboard/
│       └── page.tsx              # Main dashboard with analytics
│
└── state/                        # Redux state management
    ├── store.ts                  # Redux store configuration
    ├── slices/
    │   └── auth.ts               # Auth state slice
    └── services/                 # RTK Query API services
        ├── api.ts                # Base API configuration
        ├── auth.ts               # Auth endpoints
        └── analytics.ts          # Analytics endpoints
```

## Authentication Flow

### How It Works

1. **Bootstrapping** (`_bootstrap.tsx`):
   - On app load, attempts to refresh access token using HttpOnly cookie
   - If successful, fetches user data and sets credentials
   - Marks app as "bootstrapped" to prevent UI flashing

2. **Protected Routes** (`(protected)/layout.tsx`):
   - Waits for bootstrap to complete
   - Redirects to login if no access token
   - Preserves intended destination in `?next=` query param

3. **Token Management**:
   - Access tokens stored in Redux (memory)
   - Refresh tokens stored in HttpOnly cookies (secure)
   - Automatic token refresh on API errors (401)

### Login Flow

```typescript
// User submits login form
login({ email, password })
  ↓
// API returns access token + sets refresh cookie
dispatch(setCredentials({ accessToken, user }))
  ↓
// Redirect to dashboard (or ?next= destination)
router.push('/dashboard')
```

### Protected Request Flow

```typescript
// User navigates to /dashboard
1. Layout checks if bootstrapped → wait if false
2. Check if accessToken exists → redirect to login if null
3. Render dashboard
4. Dashboard makes API request with token in Authorization header
```

## State Management

### Redux Store Structure

```typescript
{
  auth: {
    accessToken: string | null,
    user: User | null,
    bootstrapped: boolean
  },
  api: {
    queries: { ... },   // RTK Query cache
    mutations: { ... }
  }
}
```

### RTK Query Services

#### Auth Service (`state/services/auth.ts`)

```typescript
// Login
const [login, { isLoading }] = useLoginMutation();
await login({ email, password });

// Register
const [register] = useRegisterMutation();
await register({ email, password, name });

// Get current user
const { data: user } = useMeQuery();

// Refresh token
const [refresh] = useRefreshMutation();
await refresh();

// Logout
const [logout] = useLogoutMutation();
await logout();
```

#### Analytics Service (`state/services/analytics.ts`)

```typescript
// Monthly Recurring Revenue
const { data, isLoading, error } = useMrrQuery({
  projectId: 'proj_123',
  from: '2025-01-01',
  to: '2025-10-18',
  interval: 'month'
});

// Active Users
const { data } = useActiveUsersQuery({
  projectId: 'proj_123',
  interval: 'week'
});

// Churn Rate
const { data } = useChurnQuery({
  projectId: 'proj_123',
  interval: 'month'
});
```

## Components Overview

### Login Page (`login/page.tsx`)

- Material-UI form with validation
- Error handling with dismissible alerts
- Loading states during authentication
- Redirects to dashboard on success
- Respects `?next=` redirect parameter

**Features:**
- ✅ Email and password validation
- ✅ User-friendly error messages
- ✅ Loading indicator during submission
- ✅ Auto-focus on email field
- ✅ Responsive design

### Dashboard Page (`(protected)/dashboard/page.tsx`)

- Displays key metrics in cards (MRR, Active Users, Churn)
- Loading skeletons while fetching data
- Error states with user-friendly messages
- Responsive grid layout
- Personalized greeting with user name

**Metric Cards:**
- 💰 Monthly Recurring Revenue (green)
- 👥 Active Users (blue)
- ⚠️ Churn Rate (red)

**Future Enhancements:**
- [ ] Interactive charts with Recharts
- [ ] Date range picker
- [ ] Project selector
- [ ] Export data functionality
- [ ] Real-time updates

## Styling with Material-UI

### Theme Customization

Edit `src/app/providers.tsx` to customize the theme:

```typescript
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
  typography: {
    fontFamily: 'Roboto, Arial, sans-serif',
  },
});
```

### Common MUI Components Used

- **Layout**: `Container`, `Box`, `Grid`, `Paper`, `Card`
- **Typography**: `Typography` with variants (h4, h5, h6, body1, body2)
- **Inputs**: `TextField`, `Button`
- **Feedback**: `Alert`, `CircularProgress`
- **Icons**: `TrendingUpIcon`, `PeopleIcon`, `WarningIcon`

## API Integration

### Base API Configuration (`state/services/api.ts`)

```typescript
export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.NEXT_PUBLIC_API_URL,
    credentials: 'include', // Send cookies
    prepareHeaders: (headers, { getState }) => {
      // Attach JWT token to requests
      const token = (getState() as RootState).auth?.accessToken;
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  endpoints: () => ({}),
});
```

### Adding New Endpoints

1. Create a new service file or add to existing:

```typescript
// state/services/teams.ts
import { api } from './api';

export interface Team {
  id: string;
  name: string;
  createdAt: string;
}

export const teamsApi = api.injectEndpoints({
  endpoints: (build) => ({
    getMyTeams: build.query<Team[], void>({
      query: () => '/v1/teams/mine',
    }),
    createTeam: build.mutation<Team, { name: string }>({
      query: (body) => ({
        url: '/v1/teams',
        method: 'POST',
        body,
      }),
    }),
  }),
});

export const { useGetMyTeamsQuery, useCreateTeamMutation } = teamsApi;
```

2. Use in components:

```typescript
const { data: teams, isLoading } = useGetMyTeamsQuery();
const [createTeam] = useCreateTeamMutation();
```

## Development Workflow

### Running the App

```bash
# Development with hot reload
npm run dev

# Production build
npm run build
npm start

# Lint code
npm run lint
```

### Code Quality

**ESLint Configuration:**
- Next.js recommended rules
- TypeScript strict mode
- No `any` types allowed (enforced)

**Best Practices:**
- Use TypeScript interfaces for all data shapes
- Keep components focused and small
- Use RTK Query for all API calls
- Handle loading and error states
- Implement proper accessibility (a11y)

## Common Tasks

### Adding a New Page

1. Create file in `src/app/my-page/page.tsx`
2. Add to protected routes if auth required
3. Update navigation

### Adding a New API Endpoint

1. Define types in `state/services/[service].ts`
2. Add endpoint with RTK Query
3. Export hook
4. Use in component

### Customizing the Theme

Edit `src/app/providers.tsx`:

```typescript
const theme = createTheme({
  palette: { ... },
  typography: { ... },
  components: { ... },
});
```

## Troubleshooting

### "Cannot read property of undefined"

**Cause**: Accessing data before API request completes

**Solution**: Use optional chaining and loading states

```typescript
const { data, isLoading } = useMrrQuery(...);

if (isLoading) return <CircularProgress />;
if (!data) return <Typography>No data</Typography>;

return <div>{data.series[0]}</div>;
```

### Login Redirects to Login

**Cause**: Bootstrap not completing or token invalid

**Solution**:
1. Check API is running
2. Verify `NEXT_PUBLIC_API_URL` is correct
3. Check browser console for errors
4. Clear cookies and try again

### API Requests Fail with CORS Error

**Cause**: API not allowing frontend origin

**Solution**: Update API CORS configuration in `apps/api/src/main.ts`:

```typescript
app.enableCors({
  origin: ['http://localhost:3000'],
  credentials: true,
});
```

### TypeScript Errors

**Common issues:**

1. **"Object is possibly 'null'"**
   - Use optional chaining: `user?.name`
   - Add null check: `if (user) { ... }`

2. **"Type 'any' is not assignable"**
   - Define proper interfaces
   - Never use `any` type

3. **"Cannot find module"**
   - Check import paths are relative or absolute
   - Restart TypeScript server in IDE

## Performance Optimization

### RTK Query Caching

RTK Query automatically caches API responses:

```typescript
const { data } = useMrrQuery({ projectId: 'proj1' });
// Second call with same params = instant (cached)
const { data: cached } = useMrrQuery({ projectId: 'proj1' });
```

### Code Splitting

Next.js automatically splits code by route. For heavy components:

```typescript
import dynamic from 'next/dynamic';

const HeavyChart = dynamic(() => import('./HeavyChart'), {
  loading: () => <CircularProgress />,
});
```

### Image Optimization

Use Next.js `Image` component:

```typescript
import Image from 'next/image';

<Image
  src="/logo.png"
  alt="Logo"
  width={200}
  height={50}
  priority // For above-the-fold images
/>
```

## Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in Vercel
3. Set environment variables
4. Deploy

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Environment Variables (Production)

```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_DEFAULT_PROJECT_ID=prod_project_id
```

## Security Considerations

### Token Storage

- ✅ Access tokens in memory (Redux)
- ✅ Refresh tokens in HttpOnly cookies
- ❌ Never store tokens in localStorage

### XSS Protection

- ✅ Material-UI sanitizes inputs
- ✅ Next.js escapes JSX by default
- ✅ HttpOnly cookies prevent JavaScript access

### CSRF Protection

- ✅ SameSite cookies
- ✅ CORS restrictions on API

## Future Enhancements

### Planned Features

- [ ] **Team Management UI**: Create and manage teams
- [ ] **Project Selector**: Switch between projects
- [ ] **Charts Integration**: Interactive Recharts visualizations
- [ ] **Dark Mode**: Toggle between light/dark themes
- [ ] **Notifications**: Real-time alerts and updates
- [ ] **Data Export**: Download analytics as CSV/JSON
- [ ] **User Settings**: Profile management, preferences
- [ ] **Mobile App**: React Native version

### Technical Improvements

- [ ] **Unit Tests**: Jest + React Testing Library
- [ ] **E2E Tests**: Playwright or Cypress
- [ ] **Storybook**: Component documentation
- [ ] **Performance Monitoring**: Sentry or similar
- [ ] **Analytics**: Google Analytics or Mixpanel
- [ ] **PWA**: Service worker for offline support

## Contributing

### Code Style

- Use functional components with hooks
- Prefer TypeScript interfaces over types
- Use named exports for components
- Keep files under 250 lines
- Add comments for complex logic

### Pull Request Process

1. Create feature branch
2. Implement changes with types
3. Test thoroughly
4. Submit PR with description
5. Address review feedback

## Resources

### Documentation

- [Next.js Docs](https://nextjs.org/docs)
- [Redux Toolkit](https://redux-toolkit.js.org)
- [Material-UI](https://mui.com/material-ui/getting-started/)
- [RTK Query](https://redux-toolkit.js.org/rtk-query/overview)

### Related Projects

- **API Backend**: `../api/README.md`
- **Developer Guide**: `../api/DEVELOPER_GUIDE.md`

## License

UNLICENSED - Private project
