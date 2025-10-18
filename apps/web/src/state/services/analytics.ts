import { api } from './api';

export interface TimeSeriesData {
  labels: string[];
  series: number[];
}

export interface AnalyticsQueryParams {
  projectId: string;
  qs?: string; // Query string like "?from=2025-01-01&to=2025-10-18&interval=day"
  from?: string;
  to?: string;
  interval?: 'day' | 'week' | 'month';
}

export const analyticsApi = api.injectEndpoints({
  endpoints: (build) => ({
    mrr: build.query<TimeSeriesData, AnalyticsQueryParams>({
      query: ({ projectId, qs, from, to, interval }) => {
        // Support both query string and individual params
        if (qs) {
          return `/v1/analytics/${projectId}/mrr${qs}`;
        }
        const params = new URLSearchParams();
        if (from) params.append('from', from);
        if (to) params.append('to', to);
        if (interval) params.append('interval', interval);
        const queryString = params.toString();
        return `/v1/analytics/${projectId}/mrr${queryString ? `?${queryString}` : ''}`;
      },
    }),
    activeUsers: build.query<TimeSeriesData, AnalyticsQueryParams>({
      query: ({ projectId, qs, from, to, interval }) => {
        // Support both query string and individual params
        if (qs) {
          return `/v1/analytics/${projectId}/active-users${qs}`;
        }
        const params = new URLSearchParams();
        if (from) params.append('from', from);
        if (to) params.append('to', to);
        if (interval) params.append('interval', interval);
        const queryString = params.toString();
        return `/v1/analytics/${projectId}/active-users${queryString ? `?${queryString}` : ''}`;
      },
    }),
    churn: build.query<TimeSeriesData, AnalyticsQueryParams>({
      query: ({ projectId, qs, from, to, interval }) => {
        // Support both query string and individual params
        if (qs) {
          return `/v1/analytics/${projectId}/churn${qs}`;
        }
        const params = new URLSearchParams();
        if (from) params.append('from', from);
        if (to) params.append('to', to);
        if (interval) params.append('interval', interval);
        const queryString = params.toString();
        return `/v1/analytics/${projectId}/churn${queryString ? `?${queryString}` : ''}`;
      },
    }),
  }),
});

export const { useMrrQuery, useActiveUsersQuery, useChurnQuery } = analyticsApi;