'use client';
import { Box, FormControl, InputLabel, MenuItem, Select, Stack } from '@mui/material';
import { useEffect } from 'react';
import { useMyTeamsQuery, useTeamProjectsQuery } from '../state/services/projects';

export default function ProjectSwitcher({
  teamId, setTeamId, projectId, setProjectId
}:{
  teamId: string | null; setTeamId: (v:string)=>void;
  projectId: string | null; setProjectId: (v:string)=>void;
}) {
  const { data: teams } = useMyTeamsQuery();
  const { data: projects } = useTeamProjectsQuery({ teamId: teamId! }, { skip: !teamId });

  useEffect(() => {
    if (!teamId && teams?.length) setTeamId(teams[0].id);
  }, [teams, teamId, setTeamId]);

  useEffect(() => {
    if (teamId && !projectId && projects?.length) setProjectId(projects[0].id);
  }, [teamId, projectId, projects, setProjectId]);

  return (
    <Stack direction={{ xs: 'column', sm:'row' }} spacing={2}>
      <Box sx={{ minWidth: 220 }}>
        <FormControl fullWidth size="small">
          <InputLabel>Team</InputLabel>
          <Select label="Team" value={teamId ?? ''} onChange={(e)=>setTeamId(e.target.value)}>
            {(teams||[]).map(t => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
          </Select>
        </FormControl>
      </Box>
      <Box sx={{ minWidth: 260 }}>
        <FormControl fullWidth size="small" disabled={!teamId}>
          <InputLabel>Project</InputLabel>
          <Select label="Project" value={projectId ?? ''} onChange={(e)=>setProjectId(e.target.value)}>
            {(projects||[]).map(p => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
          </Select>
        </FormControl>
      </Box>
    </Stack>
  );
}