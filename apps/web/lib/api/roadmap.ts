import { apiRequest } from './client';
import { getToken } from './auth';

export interface ModuleItem {
  id: number;
  roadmap_id: number;
  title: string;
  description: string;
  order_index: number;
  estimated_hours: number;
  status: 'locked' | 'unlocked' | 'completed';
}

export interface RoadmapSummary {
  id: number;
  title: string;
  description: string;
  difficulty: string;
  estimated_weeks: number;
  total_modules: number;
}

export interface UserRoadmapDetail {
  id: number;
  title: string;
  description: string;
  difficulty: string;
  estimated_weeks: number;
  progress_percentage: number;
  completed_modules_count: number;
  total_modules_count: number;
  modules: ModuleItem[];
}

export function getAllRoadmaps(token?: string): Promise<RoadmapSummary[]> {
  const authToken = token ?? getToken();
  return apiRequest<RoadmapSummary[]>('/roadmaps', {
    method: 'GET',
    token: authToken || undefined,
  });
}

export function getUserRoadmap(token?: string): Promise<UserRoadmapDetail | null> {
  const authToken = token ?? getToken();
  return apiRequest<UserRoadmapDetail | null>('/roadmaps/me', {
    method: 'GET',
    token: authToken || undefined,
  });
}

export function selectRoadmap(roadmapId: number, token?: string): Promise<UserRoadmapDetail> {
  const authToken = token ?? getToken();
  return apiRequest<UserRoadmapDetail>('/roadmaps/select', {
    method: 'POST',
    token: authToken || undefined,
    body: { roadmap_id: roadmapId },
  });
}

export function completeModule(moduleId: number, token?: string): Promise<UserRoadmapDetail> {
  const authToken = token ?? getToken();
  return apiRequest<UserRoadmapDetail>(`/roadmaps/modules/${moduleId}/complete`, {
    method: 'POST',
    token: authToken || undefined,
  });
}
