import { apiRequest } from './client';
import { getToken } from './auth';

export interface ContinueLearningItem {
  topic: string;
  progress: number;
}

export interface DailyActivity {
  day: string;
  minutes: number;
}

export interface RecentActivityItem {
  id: number;
  activity_type: string;
  activity_title: string;
  xp_earned: number;
  created_at: string;
}

export interface UserProgressResponse {
  name: string;
  xp: number;
  level: number;
  streak: number;
  continue_learning: ContinueLearningItem | null;
  weekly_activity: DailyActivity[];
  recent_activity: RecentActivityItem[];
}

export function getUserProgress(token?: string): Promise<UserProgressResponse> {
  const authToken = token ?? getToken();
  return apiRequest<UserProgressResponse>('/users/progress', {
    method: 'GET',
    token: authToken || undefined,
  });
}
