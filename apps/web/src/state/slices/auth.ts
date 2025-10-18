import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { User } from '../services/auth';

interface AuthState {
  accessToken: string | null;
  user: User | null;
  bootstrapped: boolean;
}

const initialState: AuthState = { accessToken: null, user: null, bootstrapped: false };

const slice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(state, action: PayloadAction<{ accessToken: string; user: User | null }>) {
      state.accessToken = action.payload.accessToken;
      state.user = action.payload.user;
    },
    clearAuth(state) {
      state.accessToken = null;
      state.user = null;
    },
    setBootstrapped(state) { state.bootstrapped = true; },
  },
});

export const { setCredentials, clearAuth, setBootstrapped } = slice.actions;
export default slice.reducer;