'use client';
import { AppBar, Toolbar, Typography, Box, IconButton, Menu, MenuItem, Button } from '@mui/material';
import { AccountCircle } from '@mui/icons-material';
import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import type { RootState } from '../state/store';
import { useLogoutMutation } from '../state/services/auth';
import { clearAuth } from '../state/slices/auth';

export default function Header() {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const user = useSelector((s: RootState) => s.auth.user);
  const dispatch = useDispatch();
  const router = useRouter();
  const pathname = usePathname();
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
        <Typography variant="h6" component="div" sx={{ fontWeight: 600, mr: 4 }}>
          SaaS Dashboard
        </Typography>

        <Box sx={{ flexGrow: 1, display: { xs: 'none', sm: 'flex' }, gap: 1 }}>
          <Button
            component={Link}
            href="/dashboard"
            color={pathname === '/dashboard' ? 'primary' : 'inherit'}
            sx={{ fontWeight: pathname === '/dashboard' ? 600 : 400 }}
          >
            Dashboard
          </Button>
          <Button
            component={Link}
            href="/teams"
            color={pathname === '/teams' ? 'primary' : 'inherit'}
            sx={{ fontWeight: pathname === '/teams' ? 600 : 400 }}
          >
            Teams
          </Button>
          <Button
            component={Link}
            href="/projects"
            color={pathname === '/projects' ? 'primary' : 'inherit'}
            sx={{ fontWeight: pathname === '/projects' ? 600 : 400 }}
          >
            Projects
          </Button>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {user && (
            <Typography variant="body2" color="text.secondary" sx={{ mr: 1, display: { xs: 'none', md: 'block' } }}>
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
