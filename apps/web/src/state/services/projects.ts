import { api } from './api';

export interface Team {
  id: string;
  name: string;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  teamId: string;
  apiKey: string;
  createdAt: string;
}

export const projectsApi = api.injectEndpoints({
  endpoints: (build) => ({
    myTeams: build.query<Team[], void>({
      query: () => '/v1/teams/mine',
    }),
    teamProjects: build.query<Project[], { teamId: string }>({
      query: ({ teamId }) => `/v1/teams/${teamId}/projects`,
    }),
  }),
});

export const { useMyTeamsQuery, useTeamProjectsQuery } = projectsApi;