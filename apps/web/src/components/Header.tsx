'use client';
import { AppBar, Toolbar, Typography, Box, IconButton, Menu, MenuItem } from '@mui/material';
import { AccountCircle } from '@mui/icons-material';
import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useRouter } from 'next/navigation';
import type { RootState } from '../state/store';
import { useLogoutMutation } from '../state/services/auth';
import { clearAuth } from '../state/slices/auth';

export default function Header() {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const user = useSelector((s: RootState) => s.auth.user);
  const dispatch = useDispatch();
  const router = useRouter();
  const [logout, { isLoading }] = useLogoutMutation();

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    handleMenuClose();
    try {
      await logout().unwrap();
    } catch (error) {
      // Even if the API call fails, clear local state
      console.error('Logout error:', error);
    } finally {
      // Clear auth state and redirect to login
      dispatch(clearAuth());
      router.push('/login');
    }
  };

  return (
    <AppBar position="static" color="default" elevation={1}>
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 600 }}>
          SaaS Dashboard
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {user && (
            <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
              {user.email}
            </Typography>
          )}
          <IconButton
            size="large"
            onClick={handleMenuOpen}
            color="inherit"
            aria-label="account menu"
            aria-controls="account-menu"
            aria-haspopup="true"
          >
            <AccountCircle />
          </IconButton>
          <Menu
            id="account-menu"
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
          >
            {user?.name && (
              <MenuItem disabled>
                <Typography variant="body2" fontWeight={600}>
                  {user.name}
                </Typography>
              </MenuItem>
            )}
            <MenuItem onClick={handleLogout} disabled={isLoading}>
              {isLoading ? 'Logging out...' : 'Logout'}
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
