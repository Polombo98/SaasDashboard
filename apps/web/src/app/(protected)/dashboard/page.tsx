'use client';
import { Container, Typography, Box } from '@mui/material';
import { useState, useMemo } from 'react';
import ProjectSwitcher from '../../../components/ProjectSwitcher';
import DateFilters from '../../../components/DateFilters';
import ChartCard from '../../../components/ChartCard';
import { toISODate, qs } from '../../../lib/date';
import { useMrrQuery, useActiveUsersQuery, useChurnQuery } from '../../../state/services/analytics';

export default function DashboardPage() {
  const [teamId, setTeamId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [from, setFrom] = useState(() => toISODate(new Date(Date.now() - 30 * 24 * 3600 * 1000)));
  const [to, setTo] = useState(() => toISODate(new Date()));
  const [interval, setInterval] = useState<'day' | 'week' | 'month'>('day');

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

  return (
    <Container sx={{ py: 3 }} maxWidth="xl">
        <Typography variant="h5" gutterBottom fontWeight={600}>
          Analytics Dashboard
        </Typography>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1.5fr 1fr' },
            gap: 2,
            mb: 3,
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

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
            gap: 2,
          }}
        >
          <ChartCard title="Revenue (MRR)" data={mrr} />
          <ChartCard title="Active Users" data={active} />
          <ChartCard title="Churn Rate (%)" data={churn} />
        </Box>
      </Container>
  );
}