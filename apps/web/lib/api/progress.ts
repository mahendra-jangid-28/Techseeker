import { apiRequest } from './client';
import { getToken } from './auth';

export interface ContinueLearningItem {
  topic: string;
  progress: number;
}

export interface DailyActivity {
  day: string;
  minutes: number;
  activities_count?: number;
}

export interface HeatmapDay {
  date: string;
  day: string;
  count: number;
  level: number;
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
  lessons_completed: number;
  roadmap_progress_percentage: number;
  quizzes_completed: number;
  challenges_passed: number;
  active_weak_topics_count: number;
  resolved_topics_count: number;
  continue_learning: ContinueLearningItem | null;
  weekly_activity: DailyActivity[];
  heatmap: number[][];
  heatmap_days: HeatmapDay[];
  recent_activity: RecentActivityItem[];
}

export function getUserProgress(token?: string): Promise<UserProgressResponse> {
  const authToken = token ?? getToken();
  return apiRequest<UserProgressResponse>('/users/progress', {
    method: 'GET',
    token: authToken || undefined,
  });
}
