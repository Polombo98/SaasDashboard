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

export interface RegisterResponse {
  message: string;
  email: string;
}

export interface RefreshResponse {
  accessToken: string;
}

export interface VerifyEmailResponse {
  message: string;
}

export interface ResendVerificationResponse {
  message: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordResponse {
  message: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

export interface ResetPasswordResponse {
  message: string;
}

export const authApi = api.injectEndpoints({
  endpoints: (build) => ({
    login: build.mutation<AuthResponse, LoginRequest>(
      { query: (body) => ({ url: '/v1/auth/login', method: 'POST', body }) }
    ),
    register: build.mutation<RegisterResponse, RegisterRequest>(
      { query: (body) => ({ url: '/v1/auth/register', method: 'POST', body }) }
    ),
    verifyEmail: build.mutation<VerifyEmailResponse, { token: string }>(
      { query: ({ token }) => ({ url: `/v1/auth/verify-email?token=${token}`, method: 'GET' }) }
    ),
    resendVerification: build.mutation<ResendVerificationResponse, { email: string }>(
      { query: (body) => ({ url: '/v1/auth/resend-verification', method: 'POST', body }) }
    ),
    forgotPassword: build.mutation<ForgotPasswordResponse, ForgotPasswordRequest>(
      { query: (body) => ({ url: '/v1/auth/forgot-password', method: 'POST', body }) }
    ),
    resetPassword: build.mutation<ResetPasswordResponse, ResetPasswordRequest>(
      { query: (body) => ({ url: '/v1/auth/reset-password', method: 'POST', body }) }
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

export const {
  useLoginMutation,
  useRegisterMutation,
  useVerifyEmailMutation,
  useResendVerificationMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useMeQuery,
  useRefreshMutation,
  useLogoutMutation
} = authApi;