'use client';
import { Container, Typography, Box, Paper, Card, CardContent } from '@mui/material';
import { useState, useMemo } from 'react';
import {
  People as PeopleIcon,
  TrendingDown as TrendingDownIcon,
  AttachMoney as MoneyIcon,
} from '@mui/icons-material';
import ProjectSwitcher from '../../../components/ProjectSwitcher';
import DateFilters from '../../../components/DateFilters';
import ChartCard from '../../../components/ChartCard';
import { toISODate, qs } from '../../../lib/date';
import { useMrrQuery, useActiveUsersQuery, useChurnQuery } from '../../../state/services/analytics';

export default function DashboardPage() {
  const [teamId, setTeamId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [from, setFrom] = useState(() => toISODate(new Date(Date.now() - 90 * 24 * 3600 * 1000)));
  const [to, setTo] = useState(() => toISODate(new Date()));
  const [interval, setInterval] = useState<'day' | 'week' | 'month'>('week');

  const queryString = useMemo(() => qs({ from, to, interval }), [from, to, interval]);

  const { data: mrr } = useMrrQuery(
    { projectId: projectId!, qs: queryString },
    { skip: !projectId }
  );
  const { data: active } = useActiveUsersQuery(
    { projectId: projectId!, qs: queryString },
    { skip: !projectId }
  );
  const { data: churn } = useChurnQuery(
    { projectId: projectId!, qs: queryString },
    { skip: !projectId }
  );

  // Calculate summary stats
  const totalRevenue = mrr?.series.reduce((sum, val) => sum + val, 0) ?? 0;
  const totalUsers = active?.series.length
    ? Math.round(active.series.reduce((sum, val) => sum + val, 0) / active.series.length)
    : 0;
  const churnRate = churn?.series.length
    ? churn.series.reduce((sum, val) => sum + val, 0) / churn.series.length
    : 0;

  const stats = [
    {
      title: 'Total Revenue (Period)',
      value: `$${totalRevenue.toLocaleString()}`,
      icon: <MoneyIcon sx={{ fontSize: 32 }} />,
      color: '#10b981',
      bgColor: '#10b98115',
    },
    {
      title: 'Avg Active Users',
      value: totalUsers.toLocaleString(),
      icon: <PeopleIcon sx={{ fontSize: 32 }} />,
      color: '#3b82f6',
      bgColor: '#3b82f615',
    },
    {
      title: 'Avg Churn Rate',
      value: `${churnRate.toFixed(1)}%`,
      icon: <TrendingDownIcon sx={{ fontSize: 32 }} />,
      color: '#ef4444',
      bgColor: '#ef444415',
    },
  ];

  return (
    <Container sx={{ py: 4 }} maxWidth="xl">
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          Analytics Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Track your key metrics and performance over time
        </Typography>
      </Box>

      {/* Filters */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 4,
          bgcolor: 'background.paper',
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: '1.5fr 1fr' },
            gap: 3,
          }}
        >
          <ProjectSwitcher
            teamId={teamId}
            setTeamId={setTeamId}
            projectId={projectId}
            setProjectId={setProjectId}
          />
          <DateFilters
            from={from}
            to={to}
            interval={interval}
            setFrom={setFrom}
            setTo={setTo}
            setInterval={setInterval}
          />
        </Box>
      </Paper>

      {/* Summary Stats Cards */}
      {projectId && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
            gap: 3,
            mb: 4,
          }}
        >
          {stats.map((stat) => (
            <Card
              key={stat.title}
              elevation={2}
              sx={{
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 4,
                },
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {stat.title}
                    </Typography>
                    <Typography variant="h4" fontWeight={700} sx={{ color: stat.color }}>
                      {stat.value}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      bgcolor: stat.bgColor,
                      color: stat.color,
                      borderRadius: 2,
                      p: 1.5,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {stat.icon}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      {/* Charts */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
          gap: 3,
        }}
      >
        <ChartCard
          title="Revenue (MRR)"
          data={mrr}
          icon={<MoneyIcon sx={{ fontSize: 28 }} />}
          color="#10b981"
        />
        <ChartCard
          title="Active Users"
          data={active}
          icon={<PeopleIcon sx={{ fontSize: 28 }} />}
          color="#3b82f6"
        />
        <ChartCard
          title="Churn Rate (%)"
          data={churn}
          icon={<TrendingDownIcon sx={{ fontSize: 28 }} />}
          color="#ef4444"
        />
      </Box>
    </Container>
  );
}