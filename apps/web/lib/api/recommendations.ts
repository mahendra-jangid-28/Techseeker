import { apiRequest } from './client';
import type {
  StudyRecommendationResponse,
  UserMemoryResponse,
  WeakTopicResponse,
} from '../types/recommendations';

export function getStudyRecommendations(
  token: string,
): Promise<StudyRecommendationResponse> {
  return apiRequest<StudyRecommendationResponse>('/users/recommendations', {
    token,
  });
}

export function refreshStudyRecommendations(
  token: string,
): Promise<StudyRecommendationResponse> {
  return apiRequest<StudyRecommendationResponse>(
    '/users/recommendations/refresh',
    {
      method: 'POST',
      token,
    },
  );
}

export function getWeakTopics(token: string): Promise<WeakTopicResponse> {
  return apiRequest<WeakTopicResponse>('/users/weak-topics', {
    token,
  });
}

export function getUserMemory(token: string): Promise<UserMemoryResponse> {
  return apiRequest<UserMemoryResponse>('/users/memory', {
    token,
  });
}
