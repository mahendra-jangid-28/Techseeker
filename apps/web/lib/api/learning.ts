import { apiRequest } from './client';
import { getToken } from './auth';

export type LearningRequest = {
  topic: string;
  language?: string;
  level?: string;
};

export type ExampleItem = {
  title: string;
  explanation: string;
  code: string | null;
};

export type QuizQuestion = {
  question: string;
  options: string[];
  answer: string;
  explanation: string;
};

export type PracticeItem = {
  question: string;
  hint: string;
};

export type Assignment = {
  title: string;
  description: string;
  requirements: string[];
};

export type MiniProject = {
  title: string;
  description: string;
  requirements: string[];
};

export type TopicSearchCard = {
  title: string;
  slug: string;
  category: string;
  description: string;
};

export type TopicSearchResponse = {
  query: string;
  results: TopicSearchCard[];
};

export type LearningResponse = {
  topic: string;
  why_learn_this: string;
  professional_definition: string;
  easy_explanation: string;
  real_world_analogy: string;
  real_world_applications: string[];
  syntax_or_core_concepts: string;
  examples: ExampleItem[];
  common_mistakes: string[];
  interactive_practice: PracticeItem[];
  quiz: QuizQuestion[];
  assignment: Assignment;
  mini_project: MiniProject;
  related_topics: string[];
  summary?: string;
  next_topic: string;
  cached?: boolean;
};

export async function searchKnowledgeTopics(
  query: string,
  token?: string,
): Promise<TopicSearchResponse> {
  const authToken = token ?? getToken();
  const params = new URLSearchParams();
  if (query) params.append('q', query);

  return apiRequest<TopicSearchResponse>(`/learning/search?${params.toString()}`, {
    method: 'GET',
    token: authToken || undefined,
  });
}

export async function generateLearningContent(
  data: LearningRequest,
  token?: string,
): Promise<LearningResponse> {
  const authToken = token ?? getToken();

  return apiRequest<LearningResponse>('/learning/generate', {
    method: 'POST',
    token: authToken || undefined,
    body: {
      topic: data.topic,
      language: data.language ?? 'English',
      level: data.level ?? 'beginner',
    },
  });
}
