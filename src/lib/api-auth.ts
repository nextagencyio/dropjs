import { apiFetch } from './api-client';

export interface User {
  uid: number;
  uuid: string;
  name: string;
  email: string;
  status: boolean;
  roles?: string[];
  created?: string;
  changed?: string;
}

export interface LoginResponse {
  data: {
    user: User;
    token: string;
    expires: string;
  };
}

export async function login(name: string, password: string): Promise<LoginResponse> {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, password }),
  });

  if (!response.ok) {
    let message = 'Login failed';
    try {
      const body = await response.json();
      message = body.error?.message ?? message;
    } catch {
      // ignore parse error
    }
    throw new Error(message);
  }

  return response.json();
}

export async function logout(): Promise<void> {
  await apiFetch('/auth/logout', { method: 'POST' });
}

export async function register(name: string, email: string, password: string): Promise<LoginResponse> {
  return apiFetch<LoginResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });
}

export async function forgotPassword(email: string): Promise<{ message: string }> {
  const response = await fetch('/api/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  return response.json();
}

export async function resetPassword(token: string, password: string): Promise<{ message?: string; error?: { message: string } }> {
  const response = await fetch('/api/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, password }),
  });
  return response.json();
}
