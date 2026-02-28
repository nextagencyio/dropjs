import { apiFetch } from './api-client';
import type { User } from './api-auth';

export interface UserListResponse {
  data: User[];
  meta: { total: number };
}

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  status?: boolean;
  roles?: string[];
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  password?: string;
  status?: boolean;
  roles?: string[];
}

export interface RoleData {
  name: string;
  label: string;
  weight: number;
  is_admin?: boolean;
}

export interface RolePermissions {
  role: RoleData;
  permissions: string[];
  allPermissions: { name: string; title: string; description?: string }[];
}

export async function fetchUsers(): Promise<UserListResponse> {
  return apiFetch<UserListResponse>('/users');
}

export async function fetchUser(uid: number): Promise<{ data: User }> {
  return apiFetch<{ data: User }>(`/users/${uid}`);
}

export async function createUser(input: CreateUserInput): Promise<{ data: User }> {
  return apiFetch<{ data: User }>('/users', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateUser(uid: number, input: UpdateUserInput): Promise<{ data: User }> {
  return apiFetch<{ data: User }>(`/users/${uid}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function deleteUser(uid: number): Promise<void> {
  await apiFetch(`/users/${uid}`, { method: 'DELETE' });
}

export async function fetchRoles(): Promise<{ data: RoleData[] }> {
  return apiFetch<{ data: RoleData[] }>('/roles');
}

export async function createRole(name: string, label: string): Promise<{ data: RoleData }> {
  return apiFetch<{ data: RoleData }>('/roles', {
    method: 'POST',
    body: JSON.stringify({ name, label }),
  });
}

export async function deleteRole(name: string): Promise<void> {
  await apiFetch(`/roles/${name}`, { method: 'DELETE' });
}

export async function fetchRolePermissions(roleName: string): Promise<RolePermissions> {
  return apiFetch<RolePermissions>(`/roles/${roleName}/permissions`);
}

export async function updateRolePermissions(
  roleName: string,
  permissions: string[],
): Promise<void> {
  await apiFetch(`/roles/${roleName}/permissions`, {
    method: 'PUT',
    body: JSON.stringify({ permissions }),
  });
}
