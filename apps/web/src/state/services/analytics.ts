import { api } from './api';

export interface TimeSeriesData {
  labels: string[];
  series: number[];
}

export interface AnalyticsQueryParams {
  projectId: string;
  from?: string;
  to?: string;
  interval?: 'day' | 'week' | 'month';
}

export const analyticsApi = api.injectEndpoints({
  endpoints: (build) => ({
    mrr: build.query<TimeSeriesData, AnalyticsQueryParams>({
      query: ({ projectId, from, to, interval }) => {
        const params = new URLSearchParams();
        if (from) params.append('from', from);
        if (to) params.append('to', to);
        if (interval) params.append('interval', interval);
        const qs = params.toString();
        return `/v1/analytics/${projectId}/mrr${qs ? `?${qs}` : ''}`;
      },
    }),
    activeUsers: build.query<TimeSeriesData, AnalyticsQueryParams>({
      query: ({ projectId, from, to, interval }) => {
        const params = new URLSearchParams();
        if (from) params.append('from', from);
        if (to) params.append('to', to);
        if (interval) params.append('interval', interval);
        const qs = params.toString();
        return `/v1/analytics/${projectId}/active-users${qs ? `?${qs}` : ''}`;
      },
    }),
    churn: build.query<TimeSeriesData, AnalyticsQueryParams>({
      query: ({ projectId, from, to, interval }) => {
        const params = new URLSearchParams();
        if (from) params.append('from', from);
        if (to) params.append('to', to);
        if (interval) params.append('interval', interval);
        const qs = params.toString();
        return `/v1/analytics/${projectId}/churn${qs ? `?${qs}` : ''}`;
      },
    }),
  }),
});

export const { useMrrQuery, useActiveUsersQuery, useChurnQuery } = analyticsApi;