'use client';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setBootstrapped, setCredentials } from '../state/slices/auth';
import { useRefreshMutation, useMeQuery } from '../state/services/auth';
import type { RootState } from '../state/store';

export default function Bootstrapper() {
  const dispatch = useDispatch();
  const token = useSelector((s: RootState) => s.auth.accessToken);
  const [refresh] = useRefreshMutation();
  const { refetch } = useMeQuery(undefined, { skip: !token });

  useEffect(() => {
    (async () => {
      if (!token) {
        const r = await refresh().unwrap().catch(() => null);
        if (r?.accessToken) {
          dispatch(setCredentials({ accessToken: r.accessToken, user: null }));
          await refetch();
        }
      }
      dispatch(setBootstrapped());
    })();
  }, []); // eslint-disable-line

  return null;
}