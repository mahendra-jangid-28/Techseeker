import { apiRequest } from './client';

const TOKEN_KEY = 'techseeker_access_token';

export type AuthTokenResponse = {
  access_token: string;
  token_type: string;
};

export type RegisterResponse = {
  id: number;
  email: string;
  full_name: string;
};

export type UserResponse = {
  id: number;
  email: string;
  full_name: string;
};

export function saveToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
  window.dispatchEvent(new Event('auth-change'));
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function clearToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  window.dispatchEvent(new Event('auth-change'));
}

export function login(email: string, password: string): Promise<AuthTokenResponse> {
  return apiRequest<AuthTokenResponse>('/auth/login', {
    method: 'POST',
    form: {
      username: email,
      password,
    },
  });
}

export function register(
  email: string,
  fullName: string,
  password: string,
): Promise<RegisterResponse> {
  return apiRequest<RegisterResponse>('/auth/register', {
    method: 'POST',
    body: {
      email,
      full_name: fullName,
      password,
    },
  });
}

export function getCurrentUser(token?: string): Promise<UserResponse> {
  const authToken = token ?? getToken();
  return apiRequest<UserResponse>('/users/me', {
    method: 'GET',
    token: authToken || undefined,
  });
}
