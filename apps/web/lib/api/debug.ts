import { apiRequest } from './client';

export type CodeDebugRequest = {
  language: string;
  code: string;
  stdout: string;
  stderr: string;
  exit_code: number | null;
};

export type CodeDebugResponse = {
  summary: string;
  error_type: string;
  explanation: string;
  fix: string;
  improved_code: string;
  complexity: string;
  tips: string[];
};

export async function analyzeCode(
  data: CodeDebugRequest,
): Promise<CodeDebugResponse> {
  return apiRequest<CodeDebugResponse>('/api/v1/debug/analyze', {
    method: 'POST',
    body: data,
  });
}
