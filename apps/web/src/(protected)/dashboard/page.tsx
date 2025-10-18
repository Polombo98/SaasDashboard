'use client';
import ProtectedLayout from '../layout';
import {
  Container,
  Typography,
  Paper,
  Box,
  CircularProgress,
  Alert,
  Card,
  CardContent,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  People as PeopleIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { useMrrQuery, useActiveUsersQuery, useChurnQuery } from '../../state/services/analytics';
import { useSelector } from 'react-redux';
import type { RootState } from '../../state/store';

// TODO: Replace with actual project selection from teams/projects
const PROJECT_ID = process.env.NEXT_PUBLIC_DEFAULT_PROJECT_ID || 'REPLACE_WITH_PROJECT_ID';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color?: string;
}

function MetricCard({ title, value, icon, color = 'primary.main' }: MetricCardProps) {
  return (
    <Card elevation={2}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography color="text.secondary" variant="body2" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h4" fontWeight={600}>
              {value}
            </Typography>
          </Box>
          <Box
            sx={{
              bgcolor: color,
              color: 'white',
              p: 1,
              borderRadius: 2,
              display: 'flex',
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const user = useSelector((s: RootState) => s.auth.user);
  const { data: mrr, isLoading: mrrLoading, error: mrrError } = useMrrQuery({
    projectId: PROJECT_ID,
    interval: 'month',
  });
  const { data: activeUsers, isLoading: auLoading, error: auError } = useActiveUsersQuery({
    projectId: PROJECT_ID,
    interval: 'week',
  });
  const { data: churn, isLoading: churnLoading, error: churnError } = useChurnQuery({
    projectId: PROJECT_ID,
    interval: 'month',
  });

  const latestMrr = mrr?.series[mrr.series.length - 1] || 0;
  const latestActiveUsers = activeUsers?.series[activeUsers.series.length - 1] || 0;
  const latestChurn = churn?.series[churn.series.length - 1] || 0;

  return (
    <ProtectedLayout>
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" fontWeight={600} gutterBottom>
            Welcome back, {user?.name || user?.email}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Here&apos;s what&apos;s happening with your projects
          </Typography>
        </Box>

        {(mrrError || auError || churnError) && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            Unable to load some analytics data. Please check your project configuration.
          </Alert>
        )}

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(3, 1fr)',
            },
            gap: 3,
            mb: 4,
          }}
        >
          {mrrLoading ? (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <CircularProgress size={24} />
            </Paper>
          ) : (
            <MetricCard
              title="Monthly Recurring Revenue"
              value={`$${latestMrr.toLocaleString()}`}
              icon={<TrendingUpIcon />}
              color="success.main"
            />
          )}

          {auLoading ? (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <CircularProgress size={24} />
            </Paper>
          ) : (
            <MetricCard
              title="Active Users"
              value={latestActiveUsers.toLocaleString()}
              icon={<PeopleIcon />}
              color="primary.main"
            />
          )}

          {churnLoading ? (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <CircularProgress size={24} />
            </Paper>
          ) : (
            <MetricCard
              title="Churn Rate"
              value={`${latestChurn.toFixed(1)}%`}
              icon={<WarningIcon />}
              color="error.main"
            />
          )}
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
            gap: 3,
          }}
        >
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Revenue Trend
            </Typography>
            {mrrLoading ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : mrr ? (
              <Box sx={{ mt: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Last {mrr.labels.length} months
                </Typography>
                {/* TODO: Add chart visualization */}
                <pre style={{ fontSize: 10 }}>{JSON.stringify(mrr, null, 2)}</pre>
              </Box>
            ) : (
              <Typography color="text.secondary">No data available</Typography>
            )}
          </Paper>

          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Active Users Trend
            </Typography>
            {auLoading ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : activeUsers ? (
              <Box sx={{ mt: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Last {activeUsers.labels.length} weeks
                </Typography>
                {/* TODO: Add chart visualization */}
                <pre style={{ fontSize: 10 }}>{JSON.stringify(activeUsers, null, 2)}</pre>
              </Box>
            ) : (
              <Typography color="text.secondary">No data available</Typography>
            )}
          </Paper>
        </Box>
      </Container>
    </ProtectedLayout>
  );
}