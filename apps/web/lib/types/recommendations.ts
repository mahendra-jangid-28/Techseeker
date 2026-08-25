export interface UserMemoryItem {
  id: number;
  memory_key: string;
  memory_value: string;
  memory_type: string;
  importance: number;
  created_at: string;
  updated_at: string;
}

export interface UserMemoryResponse {
  memories: UserMemoryItem[];
}

export interface WeakTopicItem {
  id: number;
  topic: string;
  failure_count: number;
  successful_attempts: number;
  attempt_count: number;
  confidence: number;
  status: 'tracking' | 'active' | 'improving' | 'resolved';
  last_failed_at?: string | null;
  last_success_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface WeakTopicResponse {
  weak_topics: WeakTopicItem[];
}

export interface StudyRecommendationItem {
  id: number;
  recommendation_type:
    | 'weak_topic_revision'
    | 'continue_learning'
    | 'next_roadmap_module'
    | 'practice'
    | 'review';
  title: string;
  description: string;
  topic: string;
  priority: number;
  reason: string;
  action_url?: string | null;
  status: 'pending' | 'completed' | 'dismissed';
  recommended_for?: string | null;
  created_at: string;
}

export interface StudyRecommendationResponse {
  recommendations: StudyRecommendationItem[];
}
