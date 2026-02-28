'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  fetchUsers,
  fetchRoles,
  createUser,
  updateUser,
  deleteUser,
  type CreateUserInput,
  type UpdateUserInput,
  type RoleData,
} from '@/lib/api-users';
import type { User } from '@/lib/api-auth';

export default function PeoplePage() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<RoleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [usersRes, rolesRes] = await Promise.all([
        fetchUsers(),
        fetchRoles(),
      ]);
      setUsers(usersRes.data);
      setRoles(rolesRes.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelete = async (user: User) => {
    if (!confirm(`Delete user "${user.name}"? This cannot be undone.`)) return;
    try {
      await deleteUser(user.uid);
      loadData();
    } catch {
      alert('Failed to delete user');
    }
  };

  if (error) {
    return (
      <div>
        <h1 className="text-[28px] font-normal tracking-tight mb-5 text-gin-title">
          People
        </h1>
        <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-gin-s border border-red-200">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div>
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

      {loading ? (
        <div className="bg-white border border-gin-border rounded-gin p-8 text-center text-gin-text-light">
          Loading...
        </div>
      ) : users.length === 0 ? (
        <div className="bg-white border border-gin-border rounded-gin p-8 text-center text-gin-text-light text-sm">
          No users found.
        </div>
      ) : (
        <div className="bg-white border border-gin-border rounded-gin overflow-hidden">
          <table className="w-full text-sm">
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
            loadData();
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
            loadData();
          }}
        />
      )}
    </div>
  );
}

function UserFormModal({
  user,
  roles,
  onClose,
  onSaved,
}: {
  user?: User;
  roles: RoleData[];
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
        const input: UpdateUserInput = {
          name,
          email,
          status,
          roles: selectedRoles,
        };
        if (password) input.password = password;
        await updateUser(user!.uid, input);
      } else {
        const input: CreateUserInput = {
          name,
          email,
          password,
          status,
          roles: selectedRoles,
        };
        await createUser(input);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-gin-l shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto mx-4">
        <div className="px-6 py-4 border-b border-gin-border">
          <h2 className="text-lg font-semibold text-gin-title">
            {isEdit ? 'Edit User' : 'Create User'}
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
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
