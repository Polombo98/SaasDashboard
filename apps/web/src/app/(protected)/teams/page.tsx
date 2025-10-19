'use client';
import {
  Container,
  Typography,
  Box,
  Button,
  Card,
  CardContent,
  CardActions,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
} from '@mui/material';
import { Add as AddIcon, PersonAdd as PersonAddIcon } from '@mui/icons-material';
import { useState } from 'react';
import { useMyTeamsQuery, useCreateTeamMutation, useAddTeamMemberMutation } from '../../../state/services/projects';

export default function TeamsPage() {
  const { data: teams, isLoading, error } = useMyTeamsQuery();
  const [createTeam, { isLoading: isCreating }] = useCreateTeamMutation();
  const [addMember, { isLoading: isAddingMember }] = useAddTeamMemberMutation();

  // Create team dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);

  // Add member dialog state
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [selectedTeamName, setSelectedTeamName] = useState<string>('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'MEMBER'>('MEMBER');
  const [memberError, setMemberError] = useState<string | null>(null);

  // Snackbar state
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const handleOpenDialog = () => {
    setDialogOpen(true);
    setTeamName('');
    setCreateError(null);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setTeamName('');
    setCreateError(null);
  };

  const handleCreateTeam = async () => {
    if (!teamName.trim()) {
      setCreateError('Team name is required');
      return;
    }

    try {
      await createTeam({ name: teamName }).unwrap();
      handleCloseDialog();
      setSnackbarMessage('Team created successfully');
      setSnackbarOpen(true);
    } catch (err) {
      const error = err as { data?: { message?: string } };
      setCreateError(error.data?.message || 'Failed to create team');
    }
  };

  const handleOpenMemberDialog = (teamId: string, teamName: string) => {
    setSelectedTeamId(teamId);
    setSelectedTeamName(teamName);
    setMemberDialogOpen(true);
    setEmail('');
    setRole('MEMBER');
    setMemberError(null);
  };

  const handleCloseMemberDialog = () => {
    setMemberDialogOpen(false);
    setSelectedTeamId('');
    setSelectedTeamName('');
    setEmail('');
    setRole('MEMBER');
    setMemberError(null);
  };

  const handleAddMember = async () => {
    if (!email.trim()) {
      setMemberError('Email is required');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setMemberError('Please enter a valid email address');
      return;
    }

    try {
      await addMember({ teamId: selectedTeamId, body: { email, role } }).unwrap();
      handleCloseMemberDialog();
      setSnackbarMessage('Member added successfully');
      setSnackbarOpen(true);
    } catch (err) {
      const error = err as { data?: { message?: string } };
      setMemberError(error.data?.message || 'Failed to add member');
    }
  };

  if (isLoading) {
    return (
      <Container sx={{ py: 3, display: 'flex', justifyContent: 'center' }} maxWidth="xl">
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container sx={{ py: 3 }} maxWidth="xl">
        <Alert severity="error">Failed to load teams</Alert>
      </Container>
    );
  }

  return (
    <Container sx={{ py: 3 }} maxWidth="xl">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={600}>
          Teams
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenDialog}>
          Create Team
        </Button>
      </Box>

      {teams?.length === 0 ? (
        <Alert severity="info">
          You don&apos;t have any teams yet. Create your first team to get started.
        </Alert>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
            gap: 2,
          }}
        >
          {teams?.map((team) => (
            <Card key={team.id} variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {team.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Created: {new Date(team.createdAt).toLocaleDateString()}
                </Typography>
              </CardContent>
              <CardActions>
                <Button size="small" href={`/projects?teamId=${team.id}`}>
                  View Projects
                </Button>
                <Button
                  size="small"
                  startIcon={<PersonAddIcon />}
                  onClick={() => handleOpenMemberDialog(team.id, team.name)}
                >
                  Add Member
                </Button>
              </CardActions>
            </Card>
          ))}
        </Box>
      )}

      {/* Create Team Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Team</DialogTitle>
        <DialogContent>
          {createError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {createError}
            </Alert>
          )}
          <TextField
            autoFocus
            margin="dense"
            label="Team Name"
            fullWidth
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            disabled={isCreating}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleCreateTeam();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={isCreating}>
            Cancel
          </Button>
          <Button onClick={handleCreateTeam} variant="contained" disabled={isCreating}>
            {isCreating ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Member Dialog */}
      <Dialog open={memberDialogOpen} onClose={handleCloseMemberDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Add Member to {selectedTeamName}</DialogTitle>
        <DialogContent>
          {memberError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {memberError}
            </Alert>
          )}
          <TextField
            autoFocus
            margin="dense"
            label="Email Address"
            type="email"
            fullWidth
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isAddingMember}
            helperText="Enter the email address of the user you want to add to this team"
            placeholder="user@example.com"
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth margin="dense">
            <InputLabel>Role</InputLabel>
            <Select
              value={role}
              label="Role"
              onChange={(e) => setRole(e.target.value as 'ADMIN' | 'MEMBER')}
              disabled={isAddingMember}
              MenuProps={{
                disablePortal: true,
                sx: { zIndex: 1400 }
              }}
            >
              <MenuItem value="MEMBER">Member</MenuItem>
              <MenuItem value="ADMIN">Admin</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseMemberDialog} disabled={isAddingMember}>
            Cancel
          </Button>
          <Button onClick={handleAddMember} variant="contained" disabled={isAddingMember}>
            {isAddingMember ? 'Adding...' : 'Add Member'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
      />
    </Container>
  );
}
