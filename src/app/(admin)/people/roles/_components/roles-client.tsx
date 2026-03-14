'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  createRole,
  deleteRole,
} from '@/app/(admin)/_actions/user';

export interface RoleRow {
  name: string;
  label: string;
}

const builtInRoles = new Set(['anonymous', 'authenticated', 'admin']);

export function RolesActions({ roles }: { roles: RoleRow[] }) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    const result = await createRole(newName, newLabel);
    if (!result.success) {
      alert(result.error ?? 'Failed to create role');
    } else {
      setNewName('');
      setNewLabel('');
      setShowCreate(false);
      router.refresh();
    }
    setCreating(false);
  };

  const handleDelete = async (role: RoleRow) => {
    if (!confirm(`Delete role "${role.label}"? This cannot be undone.`)) return;
    const result = await deleteRole(role.name);
    if (!result.success) {
      alert(result.error ?? 'Failed to delete role');
    } else {
      router.refresh();
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-[28px] font-normal tracking-tight text-gin-title">
          Roles
        </h1>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-gin-primary text-white text-sm font-medium rounded-gin-s hover:bg-gin-primary-hover transition-colors"
        >
          + Add role
        </button>
      </div>

      {roles.length === 0 ? (
        <div className="bg-white border border-gin-border rounded-gin p-8 text-center text-gin-text-light text-sm">
          No roles found.
        </div>
      ) : (
        <div className="bg-white border border-gin-border rounded-gin overflow-x-auto">
          <table className="w-full text-sm min-w-[500px]">
            <thead>
              <tr className="border-b border-gin-border-table bg-gin-bg-layer2">
                <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">
                  Role
                </th>
                <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">
                  Machine name
                </th>
                <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gin-border-table">
              {roles.map((role) => (
                <tr key={role.name} className="hover:bg-gin-primary-light transition-colors">
                  <td className="px-4 py-3 text-sm text-gin-text font-medium">
                    {role.label}
                  </td>
                  <td className="px-4 py-3 text-sm text-gin-text font-mono text-[13px]">
                    {role.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-gin-text">
                    <div className="flex gap-3">
                      <Link
                        href={`/people/roles/${role.name}/permissions`}
                        className="text-sm text-gin-primary hover:underline"
                      >
                        Permissions
                      </Link>
                      {!builtInRoles.has(role.name) && (
                        <button
                          onClick={() => handleDelete(role)}
                          className="text-sm text-gin-danger hover:underline"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-gin-l shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto mx-4">
            <div className="px-6 py-4 border-b border-gin-border">
              <h2 className="text-lg font-semibold text-gin-title">
                Add Role
              </h2>
            </div>
            <form onSubmit={handleCreate} className="px-6 py-4 space-y-4">
              <div>
                <label
                  htmlFor="role-label"
                  className="block text-[13px] font-semibold text-gin-text-light mb-1.5"
                >
                  Label <span className="text-gin-danger">*</span>
                </label>
                <input
                  id="role-label"
                  type="text"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  required
                  className="w-full border border-gin-border-form rounded-gin-s px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gin-primary focus:border-gin-primary"
                />
              </div>
              <div>
                <label
                  htmlFor="role-name"
                  className="block text-[13px] font-semibold text-gin-text-light mb-1.5"
                >
                  Machine name <span className="text-gin-danger">*</span>
                </label>
                <input
                  id="role-name"
                  type="text"
                  value={newName}
                  onChange={(e) =>
                    setNewName(
                      e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9_]/g, '_'),
                    )
                  }
                  required
                  pattern="[a-z0-9_]+"
                  className="w-full border border-gin-border-form rounded-gin-s px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-gin-primary focus:border-gin-primary"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-gin-border">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2 bg-white text-gin-text text-sm font-medium rounded-gin-s border border-gin-border hover:bg-gin-bg-layer2 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 bg-gin-primary text-white text-sm font-medium rounded-gin-s hover:bg-gin-primary-hover disabled:opacity-50 transition-colors"
                >
                  {creating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
