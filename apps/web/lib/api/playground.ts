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
