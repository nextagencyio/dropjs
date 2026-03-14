'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  loadRestResourcesAction,
  toggleRestResourceAction,
} from '@/app/(admin)/_actions/system';

interface RestResourceData {
  id: string;
  label: string;
  description: string;
  path: string;
  methods: string[];
  permissions: string[];
  enabled: boolean;
}

export default function RestResourcesClient() {
  const router = useRouter();
  const [resources, setResources] = useState<RestResourceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadResources = async () => {
    setLoading(true);
    try {
      const result = await loadRestResourcesAction();
      if (result.success) {
        setResources(result.data as RestResourceData[]);
      } else {
        setError(result.error || 'Failed to load REST resources');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load REST resources');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadResources();
  }, []);

  const handleToggle = async (resource: RestResourceData) => {
    setError('');
    setSuccess('');
    try {
      const result = await toggleRestResourceAction(resource.id, !resource.enabled);
      if (!result.success) {
        setError(result.error || 'Failed to toggle resource');
        return;
      }
      setSuccess(`REST resource "${resource.label}" ${resource.enabled ? 'disabled' : 'enabled'}.`);
      loadResources();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle resource');
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-gin border border-gin-border p-8 text-center text-gin-text-light">
        Loading...
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5">
        <Link
          href="/config"
          className="text-sm text-gin-primary hover:underline"
        >
          Configuration
        </Link>
        <span className="text-gin-text-light mx-2">/</span>
        <span className="text-sm text-gin-text">REST resources</span>
      </div>

      <div className="mb-5">
        <h1 className="text-[28px] font-normal tracking-tight text-gin-title">REST resources</h1>
        <p className="text-gin-text-light text-sm mt-1">
          Manage REST resource plugins that provide custom API endpoints.
        </p>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-gin-danger rounded-gin-s text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 px-4 py-3 bg-emerald-50 border border-emerald-200 text-gin-green rounded-gin-s text-sm">
          {success}
        </div>
      )}

      <div className="bg-white rounded-gin-l border border-gin-border overflow-x-auto">
        <table className="w-full min-w-[500px] text-sm">
          <thead className="bg-gin-bg-layer2 border-b border-gin-border-table">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-gin-text-light text-[13px] uppercase tracking-wider">ID</th>
              <th className="text-left px-4 py-3 font-semibold text-gin-text-light text-[13px] uppercase tracking-wider">Label</th>
              <th className="text-left px-4 py-3 font-semibold text-gin-text-light text-[13px] uppercase tracking-wider">Path</th>
              <th className="text-left px-4 py-3 font-semibold text-gin-text-light text-[13px] uppercase tracking-wider">Methods</th>
              <th className="text-left px-4 py-3 font-semibold text-gin-text-light text-[13px] uppercase tracking-wider">Permissions</th>
              <th className="text-center px-4 py-3 font-semibold text-gin-text-light text-[13px] uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody>
            {resources.map((resource) => (
              <tr key={resource.id} className="border-b border-gin-border-table last:border-0">
                <td className="px-4 py-3 font-mono text-xs text-gin-title">
                  {resource.id}
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm font-medium text-gin-title">{resource.label}</div>
                  {resource.description && (
                    <div className="text-xs text-gin-text-light mt-0.5">{resource.description}</div>
                  )}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-gin-text">
                  {resource.path}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {resource.methods.map((method) => (
                      <span
                        key={method}
                        className={`text-xs px-1.5 py-0.5 rounded-gin-s font-medium ${
                          method === 'GET'
                            ? 'bg-emerald-100 text-emerald-800'
                            : method === 'POST'
                            ? 'bg-blue-100 text-blue-800'
                            : method === 'PATCH'
                            ? 'bg-amber-100 text-amber-800'
                            : method === 'DELETE'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gin-bg-layer2 text-gin-text'
                        }`}
                      >
                        {method}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {resource.permissions.map((perm) => (
                      <span
                        key={perm}
                        className="text-xs bg-gin-bg-layer2 text-gin-text px-1.5 py-0.5 rounded-gin-s"
                      >
                        {perm}
                      </span>
                    ))}
                    {resource.permissions.length === 0 && (
                      <span className="text-xs text-gin-text-light">None</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => handleToggle(resource)}
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      resource.enabled
                        ? 'bg-emerald-50 text-gin-green'
                        : 'bg-gin-bg-layer2 text-gin-text-light'
                    }`}
                  >
                    {resource.enabled ? 'Enabled' : 'Disabled'}
                  </button>
                </td>
              </tr>
            ))}
            {resources.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gin-text-light">
                  No REST resources registered.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
