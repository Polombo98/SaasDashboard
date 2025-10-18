'use client';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setBootstrapped, setCredentials } from '../state/slices/auth';
import { useRefreshMutation, useMeQuery } from '../state/services/auth';
import type { RootState } from '../state/store';

export default function Bootstrapper() {
  const dispatch = useDispatch();
  const { accessToken, user } = useSelector((s: RootState) => s.auth);
  const [refresh] = useRefreshMutation();

  // Fetch user data when we have a token but no user data
  const { data: meData } = useMeQuery(undefined, {
    skip: !accessToken || !!user
  });

  // Bootstrap: Try to refresh token on initial load
  useEffect(() => {
    (async () => {
      if (!accessToken) {
        try {
          const refreshResult = await refresh().unwrap();
          if (refreshResult?.accessToken) {
            dispatch(setCredentials({
              accessToken: refreshResult.accessToken,
              user: null
            }));
          }
        } catch {
          // Refresh failed, user needs to login
        }
      }
      dispatch(setBootstrapped());
    })();
  }, []); // eslint-disable-line

  // Update user data when fetched
  useEffect(() => {
    if (meData && accessToken) {
      dispatch(setCredentials({
        accessToken,
        user: meData
      }));
    }
  }, [meData, accessToken, dispatch]);

  return null;
}