import { apiRequest } from './client';
import { getToken } from './auth';

export type Certificate = {
  id: number;
  user_id: number;
  certificate_type: 'lesson' | 'course' | 'project';
  title: string;
  course_name: string;
  recipient_name: string;
  verification_code: string;
  issue_date: string;
  metadata_json?: Record<string, any>;
  created_at: string;
};

export type CertificateVerifyResult = {
  valid: boolean;
  title?: string;
  course_name?: string;
  recipient_name?: string;
  verification_code: string;
  issue_date?: string;
  certificate_type?: string;
  status: string;
};

export async function generateCertificate(data: {
  certificate_type: string;
  title: string;
  course_name: string;
  metadata?: Record<string, any>;
}): Promise<Certificate> {
  const token = getToken();
  return apiRequest<Certificate>('/certificates/generate', {
    method: 'POST',
    token: token || undefined,
    body: data,
  });
}

export async function getMyCertificates(): Promise<Certificate[]> {
  const token = getToken();
  return apiRequest<Certificate[]>('/certificates/me', {
    method: 'GET',
    token: token || undefined,
  });
}

export async function verifyCertificate(code: string): Promise<CertificateVerifyResult> {
  return apiRequest<CertificateVerifyResult>(`/certificates/verify/${encodeURIComponent(code)}`, {
    method: 'GET',
  });
}
