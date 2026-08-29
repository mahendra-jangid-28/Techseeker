import { apiRequest } from './client';
import { getToken } from './auth';

export type ProjectEvaluationRubric = {
  functionality_score: number;
  functionality_feedback: string;
  code_quality_score: number;
  code_quality_feedback: string;
  architecture_score: number;
  architecture_feedback: string;
  readability_score: number;
  readability_feedback: string;
  documentation_score: number;
  documentation_feedback: string;
  ui_ux_feedback?: string;
  suggestions: string[];
  final_score: number;
  passed: boolean;
  summary: string;
};

export type ProjectListItem = {
  id: number;
  user_id: number;
  name: string;
  language: string;
  description?: string;
  category?: string;
  difficulty?: string;
  tech_stack?: string;
  github_url?: string;
  live_demo_url?: string;
  thumbnail?: string;
  status: 'draft' | 'submitted' | 'completed';
  score?: number;
  created_at: string;
  updated_at: string;
};

export type ProjectDetail = {
  id: number;
  user_id: number;
  name: string;
  language: string;
  description?: string;
  category?: string;
  difficulty?: string;
  tech_stack?: string;
  github_url?: string;
  live_demo_url?: string;
  thumbnail?: string;
  code: string;
  files?: Record<string, string>;
  status: 'draft' | 'submitted' | 'completed';
  score?: number;
  review_json?: ProjectEvaluationRubric;
  created_at: string;
  updated_at: string;
};

export type ProjectCreateInput = {
  name: string;
  language?: string;
  description?: string;
  category?: string;
  difficulty?: string;
  tech_stack?: string;
  github_url?: string;
  live_demo_url?: string;
  thumbnail?: string;
  code?: string;
  files?: Record<string, string>;
  status?: string;
};

export type ProjectUpdateInput = {
  name?: string;
  language?: string;
  description?: string;
  category?: string;
  difficulty?: string;
  tech_stack?: string;
  github_url?: string;
  live_demo_url?: string;
  thumbnail?: string;
  code?: string;
  files?: Record<string, string>;
  status?: string;
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

export async function evaluateProject(projectId: number): Promise<ProjectDetail> {
  const token = getToken();
  return apiRequest<ProjectDetail>(`/api/v1/projects/${projectId}/evaluate`, {
    method: 'POST',
    token: token || undefined,
  });
}
