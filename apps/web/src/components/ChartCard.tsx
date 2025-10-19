'use client';
import { Paper, Typography, Box } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';
import { ReactNode } from 'react';

interface ChartCardProps {
  title: string;
  data?: { labels: string[]; series: number[] };
  icon?: ReactNode;
  color?: string;
}

export default function ChartCard({ title, data, icon, color = '#1976d2' }: ChartCardProps) {
  // Calculate current value (latest data point)
  const currentValue = data?.series[data.series.length - 1] ?? 0;

  // Calculate trend (percentage change from first to last)
  const firstValue = data?.series[0] ?? 0;
  const trend = firstValue > 0 ? ((currentValue - firstValue) / firstValue) * 100 : 0;
  const isPositive = trend >= 0;

  return (
    <Paper
      elevation={2}
      sx={{
        p: 3,
        height: 400,
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 6,
        }
      }}
    >
      {/* Header with icon and title */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        {icon && (
          <Box
            sx={{
              mr: 2,
              color: color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: `${color}15`,
              borderRadius: 2,
              p: 1.5,
            }}
          >
            {icon}
          </Box>
        )}
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
            {title}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
            <Typography variant="h4" fontWeight={700}>
              {currentValue.toLocaleString()}
            </Typography>
            {trend !== 0 && (
              <Typography
                variant="body2"
                sx={{
                  color: isPositive ? 'success.main' : 'error.main',
                  fontWeight: 600,
                }}
              >
                {isPositive ? '+' : ''}{trend.toFixed(1)}%
              </Typography>
            )}
          </Box>
        </Box>
      </Box>

      {/* Chart */}
      <ResponsiveContainer width="100%" height="75%">
        <LineChart data={(data?.labels || []).map((x, i) => ({ x, y: data?.series[i] ?? 0 }))}>
          <defs>
            <linearGradient id={`gradient-${title}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.1}/>
              <stop offset="95%" stopColor={color} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="x"
            tick={{ fontSize: 12 }}
            stroke="#999"
          />
          <YAxis
            allowDecimals
            tick={{ fontSize: 12 }}
            stroke="#999"
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: `1px solid ${color}`,
              borderRadius: 8,
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            }}
          />
          <Line
            type="monotone"
            dataKey="y"
            stroke={color}
            strokeWidth={3}
            dot={false}
            fill={`url(#gradient-${title})`}
          />
        </LineChart>
      </ResponsiveContainer>
    </Paper>
  );
}