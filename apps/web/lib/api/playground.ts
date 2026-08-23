import { apiRequest } from './client';

export type CodeExecutionRequest = {
  language: string;
  code: string;
  stdin?: string;
};

export type CodeExecutionResponse = {
  status: 'success' | 'runtime_error' | 'timeout' | 'internal_error' | 'unsupported_language';
  stdout: string;
  stderr: string;
  exit_code: number | null;
  execution_time_ms: number;
  output_truncated: boolean;
};

export async function executeCode(
  data: CodeExecutionRequest,
): Promise<CodeExecutionResponse> {
  return apiRequest<CodeExecutionResponse>('/api/v1/playground/execute', {
    method: 'POST',
    body: data,
  });
}
