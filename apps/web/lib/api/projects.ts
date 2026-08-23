import { apiRequest } from './client';
import { getToken } from './auth';

export type SupportedLanguage = 'python' | 'javascript' | 'cpp';

export type ProjectListItem = {
  id: number;
  name: string;
  language: SupportedLanguage;
  created_at: string;
  updated_at: string;
};

export type ProjectDetail = {
  id: number;
  user_id: number;
  name: string;
  language: SupportedLanguage;
  code: string;
  created_at: string;
  updated_at: string;
};

export type ProjectCreateInput = {
  name: string;
  language: SupportedLanguage;
  code: string;
};

export type ProjectUpdateInput = {
  name?: string;
  language?: SupportedLanguage;
  code?: string;
};

export async function createProject(
  data: ProjectCreateInput,
): Promise<ProjectDetail> {
  const token = getToken();
  return apiRequest<ProjectDetail>('/api/v1/projects', {
    method: 'POST',
    token: token || undefined,
    body: data,
  });
}

export async function listProjects(): Promise<ProjectListItem[]> {
  const token = getToken();
  return apiRequest<ProjectListItem[]>('/api/v1/projects', {
    method: 'GET',
    token: token || undefined,
  });
}

export async function getProject(projectId: number): Promise<ProjectDetail> {
  const token = getToken();
  return apiRequest<ProjectDetail>(`/api/v1/projects/${projectId}`, {
    method: 'GET',
    token: token || undefined,
  });
}

export async function updateProject(
  projectId: number,
  data: ProjectUpdateInput,
): Promise<ProjectDetail> {
  const token = getToken();
  return apiRequest<ProjectDetail>(`/api/v1/projects/${projectId}`, {
    method: 'PUT',
    token: token || undefined,
    body: data,
  });
}

export async function deleteProject(projectId: number): Promise<{ message: string }> {
  const token = getToken();
  return apiRequest<{ message: string }>(`/api/v1/projects/${projectId}`, {
    method: 'DELETE',
    token: token || undefined,
  });
}
