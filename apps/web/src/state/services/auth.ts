import { api } from './api';

export interface User {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
}

export interface RefreshResponse {
  accessToken: string;
}

export const authApi = api.injectEndpoints({
  endpoints: (build) => ({
    login: build.mutation<AuthResponse, LoginRequest>(
      { query: (body) => ({ url: '/v1/auth/login', method: 'POST', body }) }
    ),
    register: build.mutation<AuthResponse, RegisterRequest>(
      { query: (body) => ({ url: '/v1/auth/register', method: 'POST', body }) }
    ),
    me: build.query<User, void>({ query: () => ({ url: '/v1/auth/me' }) }),
    refresh: build.mutation<RefreshResponse, void>(
      { query: () => ({ url: '/v1/auth/refresh', method: 'POST' }) }
    ),
    logout: build.mutation<void, void>(
      { query: () => ({ url: '/v1/auth/logout', method: 'POST' }) }
    ),
  }),
});

export const { useLoginMutation, useRegisterMutation, useMeQuery, useRefreshMutation, useLogoutMutation } = authApi;