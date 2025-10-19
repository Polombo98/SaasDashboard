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

export interface CreateTeamRequest {
  name: string;
}

export interface CreateProjectRequest {
  name: string;
}

export interface AddMemberRequest {
  email: string;
  role: 'ADMIN' | 'MEMBER';
}

export interface Member {
  id: string;
  role: string;
  userId: string;
  teamId: string;
}

export const projectsApi = api.injectEndpoints({
  endpoints: (build) => ({
    myTeams: build.query<Team[], void>({
      query: () => '/v1/teams/mine',
      providesTags: ['Teams'],
    }),
    teamProjects: build.query<Project[], { teamId: string }>({
      query: ({ teamId }) => `/v1/teams/${teamId}/projects`,
      providesTags: (_result, _error, { teamId }) => [{ type: 'Projects', id: teamId }],
    }),
    createTeam: build.mutation<Team, CreateTeamRequest>({
      query: (body) => ({
        url: '/v1/teams',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Teams'],
    }),
    createProject: build.mutation<Project, { teamId: string; body: CreateProjectRequest }>({
      query: ({ teamId, body }) => ({
        url: `/v1/teams/${teamId}/projects`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { teamId }) => [{ type: 'Projects', id: teamId }],
    }),
    rotateProjectKey: build.mutation<Project, { teamId: string; projectId: string }>({
      query: ({ teamId, projectId }) => ({
        url: `/v1/teams/${teamId}/projects/${projectId}/rotate-key`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, { teamId }) => [{ type: 'Projects', id: teamId }],
    }),
    addTeamMember: build.mutation<Member, { teamId: string; body: AddMemberRequest }>({
      query: ({ teamId, body }) => ({
        url: `/v1/teams/${teamId}/members`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Teams'],
    }),
  }),
});

export const {
  useMyTeamsQuery,
  useTeamProjectsQuery,
  useCreateTeamMutation,
  useCreateProjectMutation,
  useRotateProjectKeyMutation,
  useAddTeamMemberMutation,
} = projectsApi;