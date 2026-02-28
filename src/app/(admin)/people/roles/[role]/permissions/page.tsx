'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  fetchRolePermissions,
  updateRolePermissions,
  type RolePermissions as RolePermissionsData,
} from '@/lib/api-users';

export default function RolePermissionsPage() {
  const params = useParams();
  const role = params.role as string;
  const [data, setData] = useState<RolePermissionsData | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!role) return;
    fetchRolePermissions(role)
      .then((res) => {
        setData(res);
        setSelected(new Set(res.permissions));
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load');
      })
      .finally(() => setLoading(false));
  }, [role]);

  const togglePermission = (perm: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(perm)) {
        next.delete(perm);
      } else {
        next.add(perm);
      }
      return next;
    });
    setSaved(false);
  };

  const handleSave = async () => {
    if (!role) return;
    setSaving(true);
    setError(null);
    try {
      await updateRolePermissions(role, Array.from(selected));
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div>
        <div className="bg-white border border-gin-border rounded-gin p-8 text-center text-gin-text-light">
          Loading...
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div>
        <h1 className="text-[28px] font-normal tracking-tight mb-5 text-gin-title">
          Permissions
        </h1>
        <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-gin-s border border-red-200">
          {error}
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div>
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-2">
          <Link
            href="/people/roles"
            className="text-sm text-gin-primary hover:underline"
          >
            Roles
          </Link>
          <span className="text-gin-text-light">/</span>
          <span className="text-sm text-gin-text-light">Permissions</span>
        </div>
        <h1 className="text-[28px] font-normal tracking-tight text-gin-title">
          Permissions for {data.role.label}
        </h1>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-gin-s mb-4 border border-red-200">
          {error}
        </div>
      )}

      {saved && (
        <div className="bg-green-50 text-gin-green text-sm px-4 py-3 rounded-gin-s mb-4 border border-green-200">
          Permissions saved.
        </div>
      )}

      <div className="bg-white border border-gin-border rounded-gin overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gin-border-table bg-gin-bg-layer2">
              <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">
                Permission
              </th>
              <th className="w-20 text-center px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">
                Granted
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gin-border-table">
            {data.allPermissions.map((perm) => (
              <tr key={perm.name} className="hover:bg-gin-primary-light transition-colors">
                <td className="px-4 py-3">
                  <div>
                    <span className="text-sm font-medium text-gin-title">
                      {perm.title}
                    </span>
                    {perm.description && (
                      <p className="text-[12px] text-gin-text-light mt-0.5">
                        {perm.description}
                      </p>
                    )}
                    <span className="text-[12px] text-gin-text-light font-mono">
                      {perm.name}
                    </span>
                  </div>
                </td>
                <td className="text-center px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected.has(perm.name) || selected.has('*')}
                    onChange={() => togglePermission(perm.name)}
                    disabled={selected.has('*') && perm.name !== '*'}
                    className="w-4 h-4 rounded border-gin-border-form text-gin-primary focus:ring-gin-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </td>
              </tr>
            ))}
            <tr className="hover:bg-gin-primary-light transition-colors bg-amber-50/30">
              <td className="px-4 py-3">
                <div>
                  <span className="text-sm font-semibold text-gin-title">
                    All permissions (superadmin)
                  </span>
                  <p className="text-[12px] text-gin-warning mt-0.5">
                    Warning: Grants all current and future permissions.
                  </p>
                  <span className="text-[12px] text-gin-text-light font-mono">*</span>
                </div>
              </td>
              <td className="text-center px-4 py-3">
                <input
                  type="checkbox"
                  checked={selected.has('*')}
                  onChange={() => togglePermission('*')}
                  className="w-4 h-4 rounded border-gin-border-form text-gin-primary focus:ring-gin-primary"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2 bg-gin-primary text-white text-sm font-medium rounded-gin-s hover:bg-gin-primary-hover disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving...' : 'Save permissions'}
        </button>
      </div>
    </div>
  );
}
