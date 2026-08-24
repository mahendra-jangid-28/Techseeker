import { apiRequest } from './client';
import { getToken } from './auth';

export interface ExampleItem {
  title: string;
  explanation: string;
  code: string;
}

export interface InteractivePractice {
  prompt: string;
  starter_code: string;
  expected_output: string;
  language: string;
}

export interface HintLadder {
  hint_1: string;
  hint_2: string;
  hint_3: string;
  final_solution: string;
}

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  answer: string;
  explanation: string;
}

export interface Assignment {
  title: string;
  description: string;
  requirements: string[];
}

export interface LessonContent {
  title: string;
  objective: string;
  why_learn: string;
  explanation: string;
  syntax: string;
  examples: ExampleItem[];
  interactive_practice: InteractivePractice;
  hints: HintLadder;
  quiz: QuizQuestion[];
  assignment: Assignment;
}

export interface LessonDetail {
  id: number;
  roadmap_module_id: number;
  title: string;
  lesson_order: number;
  content: LessonContent;
  created_at: string;
}

export interface LessonSubmitResult {
  passed: boolean;
  score: number;
  expected_output: string;
  actual_output: string;
  feedback: string;
  error?: string | null;
}

export interface QuizQuestionResult {
  question_id: number;
  user_answer: string;
  correct_answer: string;
  is_correct: boolean;
  explanation: string;
}

export interface QuizSubmitResult {
  score: number;
  total: number;
  percentage: number;
  passed: boolean;
  results: QuizQuestionResult[];
  summary_explanation: string;
}

export function getLesson(moduleId: number, token?: string): Promise<LessonDetail> {
  const authToken = token ?? getToken();
  return apiRequest<LessonDetail>(`/lessons/${moduleId}`, {
    method: 'GET',
    token: authToken || undefined,
  });
}

export function submitLessonCode(
  lessonId: number,
  code: string,
  language: string = 'python',
  token?: string,
): Promise<LessonSubmitResult> {
  const authToken = token ?? getToken();
  return apiRequest<LessonSubmitResult>(`/lessons/${lessonId}/submit`, {
    method: 'POST',
    token: authToken || undefined,
    body: { code, language },
  });
}

export function submitLessonQuiz(
  lessonId: number,
  answers: Record<string, string>,
  token?: string,
): Promise<QuizSubmitResult> {
  const authToken = token ?? getToken();
  return apiRequest<QuizSubmitResult>(`/lessons/${lessonId}/quiz`, {
    method: 'POST',
    token: authToken || undefined,
    body: { answers },
  });
}
