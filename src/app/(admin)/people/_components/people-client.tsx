'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  createUser,
  updateUser,
  deleteUser,
} from '@/app/(admin)/_actions/user';
import { useToast } from '@/components/toast';

export interface UserRow {
  uid: number;
  name: string;
  email: string;
  status: boolean;
  roles?: string[];
  created?: string;
}

export interface RoleOption {
  name: string;
  label: string;
}

export function PeopleActions({
  users,
  roles,
}: {
  users: UserRow[];
  roles: RoleOption[];
}) {
  const router = useRouter();
  const { error: showError } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<UserRow | null>(null);

  const handleDelete = async (user: UserRow) => {
    if (!confirm(`Delete user "${user.name}"? This cannot be undone.`)) return;
    const result = await deleteUser(user.uid);
    if (!result.success) {
      showError(result.error ?? 'Failed to delete user');
    } else {
      router.refresh();
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-[28px] font-normal tracking-tight text-gin-title">
          People
        </h1>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-gin-primary text-white text-sm font-medium rounded-gin-s hover:bg-gin-primary-hover transition-colors"
        >
          + Add user
        </button>
      </div>

      {users.length === 0 ? (
        <div className="bg-white border border-gin-border rounded-gin p-8 text-center text-gin-text-light text-sm">
          No users found.
        </div>
      ) : (
        <div className="bg-white border border-gin-border rounded-gin overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="border-b border-gin-border-table bg-gin-bg-layer2">
                <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">
                  Username
                </th>
                <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">
                  Email
                </th>
                <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">
                  Roles
                </th>
                <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">
                  Created
                </th>
                <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gin-border-table">
              {users.map((user) => (
                <tr key={user.uid} className="hover:bg-gin-primary-light transition-colors">
                  <td className="px-4 py-3 text-sm text-gin-text">
                    <button
                      onClick={() => setEditUser(user)}
                      className="font-medium text-gin-primary hover:underline"
                    >
                      {user.name}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-sm text-gin-text">{user.email}</td>
                  <td className="px-4 py-3 text-sm text-gin-text">
                    <div className="flex flex-wrap gap-1">
                      {(user.roles ?? []).map((role) => (
                        <span
                          key={role}
                          className="inline-block px-2 py-0.5 text-[11px] bg-gin-bg-layer2 text-gin-text-light rounded-gin-s"
                        >
                          {role}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gin-text">
                    {user.status ? (
                      <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-gin-green">
                        <span className="w-1.5 h-1.5 rounded-full bg-gin-green" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-gin-danger">
                        <span className="w-1.5 h-1.5 rounded-full bg-gin-danger" />
                        Blocked
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gin-text">
                    {user.created
                      ? new Date(user.created).toLocaleDateString()
                      : '\u2014'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gin-text">
                    <div className="flex gap-3">
                      <button
                        onClick={() => setEditUser(user)}
                        className="text-sm text-gin-primary hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(user)}
                        className="text-sm text-gin-danger hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <UserFormModal
          roles={roles}
          onClose={() => setShowCreate(false)}
          onSaved={() => {
            setShowCreate(false);
            router.refresh();
          }}
        />
      )}

      {editUser && (
        <UserFormModal
          user={editUser}
          roles={roles}
          onClose={() => setEditUser(null)}
          onSaved={() => {
            setEditUser(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

function UserFormModal({
  user,
  roles,
  onClose,
  onSaved,
}: {
  user?: UserRow;
  roles: RoleOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!user;
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState(user?.status ?? true);
  const [selectedRoles, setSelectedRoles] = useState<string[]>(
    user?.roles ?? ['authenticated'],
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleRole = (roleName: string) => {
    setSelectedRoles((prev) =>
      prev.includes(roleName)
        ? prev.filter((r) => r !== roleName)
        : [...prev, roleName],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (isEdit) {
        const input: Record<string, unknown> = {
          name,
          email,
          status,
          roles: selectedRoles,
        };
        if (password) input.password = password;
        const result = await updateUser(user!.uid, input as any);
        if (!result.success) {
          setError(result.error ?? 'Save failed');
          setSaving(false);
          return;
        }
      } else {
        const result = await createUser({
          name,
          email,
          password,
          status,
          roles: selectedRoles,
        });
        if (!result.success) {
          setError(result.error ?? 'Save failed');
          setSaving(false);
          return;
        }
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-gin-l shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto mx-3 sm:mx-4">
        <div className="px-4 sm:px-6 py-4 border-b border-gin-border">
          <h2 className="text-lg font-semibold text-gin-title">
            {isEdit ? 'Edit User' : 'Create User'}
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-gin-s border border-red-200">
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="user-name"
              className="block text-[13px] font-semibold text-gin-text-light mb-1.5"
            >
              Username <span className="text-gin-danger">*</span>
            </label>
            <input
              id="user-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full border border-gin-border-form rounded-gin-s px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gin-primary focus:border-gin-primary"
            />
          </div>

          <div>
            <label
              htmlFor="user-email"
              className="block text-[13px] font-semibold text-gin-text-light mb-1.5"
            >
              Email <span className="text-gin-danger">*</span>
            </label>
            <input
              id="user-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border border-gin-border-form rounded-gin-s px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gin-primary focus:border-gin-primary"
            />
          </div>

          <div>
            <label
              htmlFor="user-password"
              className="block text-[13px] font-semibold text-gin-text-light mb-1.5"
            >
              Password{' '}
              {!isEdit && <span className="text-gin-danger">*</span>}
              {isEdit && (
                <span className="text-gin-text-light font-normal">
                  (leave blank to keep current)
                </span>
              )}
            </label>
            <input
              id="user-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required={!isEdit}
              className="w-full border border-gin-border-form rounded-gin-s px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gin-primary focus:border-gin-primary"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={status}
                onChange={(e) => setStatus(e.target.checked)}
                className="w-4 h-4 rounded border-gin-border-form text-gin-primary focus:ring-gin-primary"
              />
              <span className="text-sm font-medium text-gin-text">Active</span>
            </label>
          </div>

          <div>
            <span className="block text-[13px] font-semibold text-gin-text-light mb-1.5">
              Roles
            </span>
            <div className="space-y-1">
              {roles.map((role) => (
                <label
                  key={role.name}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedRoles.includes(role.name)}
                    onChange={() => toggleRole(role.name)}
                    className="w-4 h-4 rounded border-gin-border-form text-gin-primary focus:ring-gin-primary"
                  />
                  <span className="text-sm text-gin-text">{role.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-gin-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white text-gin-text text-sm font-medium rounded-gin-s border border-gin-border hover:bg-gin-bg-layer2 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-gin-primary text-white text-sm font-medium rounded-gin-s hover:bg-gin-primary-hover disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving...' : isEdit ? 'Save' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
