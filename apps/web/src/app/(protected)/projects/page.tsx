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
  IconButton,
  Tooltip,
  Snackbar,
} from '@mui/material';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  ContentCopy as CopyIcon,
} from '@mui/icons-material';
import { useState } from 'react';
import {
  useMyTeamsQuery,
  useTeamProjectsQuery,
  useCreateProjectMutation,
  useRotateProjectKeyMutation,
} from '../../../state/services/projects';

export default function ProjectsPage() {
  const { data: teams, isLoading: loadingTeams } = useMyTeamsQuery();
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const { data: projects, isLoading: loadingProjects } = useTeamProjectsQuery(
    { teamId: selectedTeamId },
    { skip: !selectedTeamId }
  );
  const [createProject, { isLoading: isCreating }] = useCreateProjectMutation();
  const [rotateKey, { isLoading: isRotating }] = useRotateProjectKeyMutation();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // Auto-select first team
  useState(() => {
    if (teams?.length && !selectedTeamId) {
      setSelectedTeamId(teams[0].id);
    }
  });

  const handleOpenDialog = () => {
    if (!selectedTeamId) {
      setSnackbarMessage('Please select a team first');
      setSnackbarOpen(true);
      return;
    }
    setDialogOpen(true);
    setProjectName('');
    setCreateError(null);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setProjectName('');
    setCreateError(null);
  };

  const handleCreateProject = async () => {
    if (!projectName.trim()) {
      setCreateError('Project name is required');
      return;
    }

    try {
      await createProject({ teamId: selectedTeamId, body: { name: projectName } }).unwrap();
      handleCloseDialog();
      setSnackbarMessage('Project created successfully');
      setSnackbarOpen(true);
    } catch (err) {
      const error = err as { data?: { message?: string } };
      setCreateError(error.data?.message || 'Failed to create project');
    }
  };

  const handleRotateKey = async (projectId: string) => {
    if (!window.confirm('Are you sure you want to rotate the API key? The old key will stop working immediately.')) {
      return;
    }

    try {
      await rotateKey({ teamId: selectedTeamId, projectId }).unwrap();
      setSnackbarMessage('API key rotated successfully');
      setSnackbarOpen(true);
    } catch (err) {
      const error = err as { data?: { message?: string } };
      setSnackbarMessage(error.data?.message || 'Failed to rotate API key');
      setSnackbarOpen(true);
    }
  };

  const handleCopyApiKey = (apiKey: string) => {
    navigator.clipboard.writeText(apiKey);
    setSnackbarMessage('API key copied to clipboard');
    setSnackbarOpen(true);
  };

  if (loadingTeams) {
    return (
      <Container sx={{ py: 3, display: 'flex', justifyContent: 'center' }} maxWidth="xl">
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container sx={{ py: 3 }} maxWidth="xl">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={600}>
          Projects
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenDialog}>
          Create Project
        </Button>
      </Box>

      {teams?.length === 0 ? (
        <Alert severity="info">
          You need to create a team first before you can create projects.{' '}
          <Button href="/teams" size="small">
            Go to Teams
          </Button>
        </Alert>
      ) : (
        <>
          <Box sx={{ mb: 3 }}>
            <FormControl fullWidth sx={{ maxWidth: 400 }}>
              <InputLabel>Select Team</InputLabel>
              <Select
                value={selectedTeamId}
                label="Select Team"
                onChange={(e) => setSelectedTeamId(e.target.value)}
                MenuProps={{
                  disablePortal: true,
                  sx: { zIndex: 1400 }
                }}
              >
                {teams?.map((team) => (
                  <MenuItem key={team.id} value={team.id}>
                    {team.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {loadingProjects ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : !selectedTeamId ? (
            <Alert severity="info">Please select a team to view projects</Alert>
          ) : projects?.length === 0 ? (
            <Alert severity="info">
              This team doesn&apos;t have any projects yet. Create your first project to get started.
            </Alert>
          ) : (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
                gap: 2,
              }}
            >
              {projects?.map((project) => (
                <Card key={project.id} variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {project.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Created: {new Date(project.createdAt).toLocaleDateString()}
                    </Typography>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        bgcolor: 'grey.100',
                        p: 1,
                        borderRadius: 1,
                        fontFamily: 'monospace',
                        fontSize: '0.875rem',
                      }}
                    >
                      <Box sx={{ flexGrow: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {project.apiKey}
                      </Box>
                      <Tooltip title="Copy API Key">
                        <IconButton size="small" onClick={() => handleCopyApiKey(project.apiKey)}>
                          <CopyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </CardContent>
                  <CardActions>
                    <Button
                      size="small"
                      startIcon={<RefreshIcon />}
                      onClick={() => handleRotateKey(project.id)}
                      disabled={isRotating}
                    >
                      Rotate Key
                    </Button>
                  </CardActions>
                </Card>
              ))}
            </Box>
          )}
        </>
      )}

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Project</DialogTitle>
        <DialogContent>
          {createError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {createError}
            </Alert>
          )}
          <TextField
            autoFocus
            margin="dense"
            label="Project Name"
            fullWidth
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            disabled={isCreating}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleCreateProject();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={isCreating}>
            Cancel
          </Button>
          <Button onClick={handleCreateProject} variant="contained" disabled={isCreating}>
            {isCreating ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
      />
    </Container>
  );
}
