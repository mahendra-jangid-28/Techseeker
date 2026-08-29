import { apiRequest } from './client';

export type CodeExecutionRequest = {
  language: string;
  code: string;
  stdin?: string;
};

export type CodeExecutionResponse = {
  stdout: string;
  stderr: string;
  exit_code: number;
  execution_time_ms: number;
};

export type TestCase = {
  id: number;
  input: string;
  expected_output: string;
  is_hidden?: boolean;
  explanation?: string;
};

export type TestCaseResult = {
  id: number;
  input: string;
  expected_output: string;
  actual_output: string;
  passed: boolean;
  execution_time_ms: number;
  error?: string;
  is_hidden?: boolean;
};

export type ChallengeExecutionRequest = {
  code: string;
  language: string;
  challenge_id?: number;
  testcases?: TestCase[];
  stdin?: string;
};

export type ChallengeExecutionResponse = {
  passed: boolean;
  passed_tests: number;
  total_tests: number;
  stdout: string;
  stderr: string;
  execution_time_ms: number;
  memory_kb: number;
  test_results: TestCaseResult[];
  feedback: string;
};

export type AICodeReviewRequest = {
  code: string;
  language: string;
  prompt?: string;
  stdout?: string;
  stderr?: string;
};

export type AICodeReviewResponse = {
  logic_analysis: string;
  readability_score: number;
  readability_feedback: string;
  detected_bugs: string[];
  edge_cases: string[];
  better_approach: string;
  time_complexity: string;
  space_complexity: string;
  hint_ladder: string[];
  overall_verdict: string;
};

export async function runPlaygroundCode(
  data: CodeExecutionRequest,
): Promise<CodeExecutionResponse> {
  return apiRequest<CodeExecutionResponse>('/playground/run', {
    method: 'POST',
    body: data,
  });
}

export async function executeCode(
  data: CodeExecutionRequest,
): Promise<CodeExecutionResponse> {
  return runPlaygroundCode(data);
}

export async function runChallengeTestcases(
  data: ChallengeExecutionRequest,
): Promise<ChallengeExecutionResponse> {
  return apiRequest<ChallengeExecutionResponse>('/playground/testcases', {
    method: 'POST',
    body: data,
  });
}

export async function getAICodeReview(
  data: AICodeReviewRequest,
): Promise<AICodeReviewResponse> {
  return apiRequest<AICodeReviewResponse>('/playground/review', {
    method: 'POST',
    body: data,
  });
}
