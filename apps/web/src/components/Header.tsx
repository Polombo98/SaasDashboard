'use client';
import { AppBar, Toolbar, Typography, Box, IconButton, Menu, MenuItem, Button, Drawer, List, ListItem, ListItemButton, ListItemText } from '@mui/material';
import { AccountCircle, Menu as MenuIcon } from '@mui/icons-material';
import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import type { RootState } from '../state/store';
import { useLogoutMutation } from '../state/services/auth';
import { clearAuth } from '../state/slices/auth';

export default function Header() {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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

  const handleMobileMenuToggle = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const handleMobileMenuClose = () => {
    setMobileMenuOpen(false);
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

  const navItems = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Teams', href: '/teams' },
    { label: 'Projects', href: '/projects' },
  ];

  return (
    <>
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar>
          {/* Mobile menu button */}
          <IconButton
            color="inherit"
            aria-label="open menu"
            edge="start"
            onClick={handleMobileMenuToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>

          <Typography variant="h6" component="div" sx={{ fontWeight: 600, mr: { xs: 0, sm: 4 }, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
            SaaS Dashboard
          </Typography>

          {/* Desktop navigation */}
          <Box sx={{ flexGrow: 1, display: { xs: 'none', sm: 'flex' }, gap: 1 }}>
            {navItems.map((item) => (
              <Button
                key={item.href}
                component={Link}
                href={item.href}
                color={pathname === item.href ? 'primary' : 'inherit'}
                sx={{ fontWeight: pathname === item.href ? 600 : 400 }}
              >
                {item.label}
              </Button>
            ))}
          </Box>

          <Box sx={{ flexGrow: { xs: 1, sm: 0 } }} />

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

      {/* Mobile navigation drawer */}
      <Drawer
        anchor="left"
        open={mobileMenuOpen}
        onClose={handleMobileMenuClose}
        sx={{ display: { sm: 'none' } }}
      >
        <Box sx={{ width: 250 }} role="presentation">
          <List>
            {navItems.map((item) => (
              <ListItem key={item.href} disablePadding>
                <ListItemButton
                  component={Link}
                  href={item.href}
                  onClick={handleMobileMenuClose}
                  selected={pathname === item.href}
                >
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{
                      fontWeight: pathname === item.href ? 600 : 400
                    }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>
    </>
  );
}
