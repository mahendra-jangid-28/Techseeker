import { apiRequest } from './client';
import { getToken } from './auth';

export type TopicPopularity = {
  topic: string;
  count: number;
};

export type DailyActivityPoint = {
  date: string;
  events_count: number;
};

export type AdminAnalytics = {
  total_users: number;
  active_users: number;
  lessons_completed: number;
  ai_requests: number;
  popular_topics: TopicPopularity[];
  completion_rate: number;
  xp_distribution: Record<string, number>;
  daily_activity: DailyActivityPoint[];
  total_projects: number;
  certificates_issued: number;
};

export async function getAdminAnalytics(): Promise<AdminAnalytics> {
  const token = getToken();
  return apiRequest<AdminAnalytics>('/admin/analytics', {
    method: 'GET',
    token: token || undefined,
  });
}
