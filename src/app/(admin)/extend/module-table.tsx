'use client';

import React, { useState } from 'react';
import { enableModule, disableModule } from '@/app/(admin)/_actions/system';

interface ModuleInfo {
  name: string;
  label: string;
  description: string;
  version: string;
  package: string;
  required: boolean;
  enabled: boolean;
}

interface ModuleTableProps {
  modules: ModuleInfo[];
}

export default function ModuleTable({ modules }: ModuleTableProps) {
  const [enabledState, setEnabledState] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const m of modules) {
      initial[m.name] = m.enabled;
    }
    return initial;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleToggle = (name: string) => {
    setEnabledState((prev) => ({ ...prev, [name]: !prev[name] }));
    setSuccess('');
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const changes: Promise<unknown>[] = [];
      for (const mod of modules) {
        const wasEnabled = mod.enabled;
        const isEnabled = enabledState[mod.name];
        if (wasEnabled !== isEnabled) {
          if (isEnabled) {
            changes.push(enableModule(mod.name));
          } else {
            changes.push(disableModule(mod.name));
          }
        }
      }

      const results = await Promise.all(changes);
      const failed = results.find((r: any) => !r.success);
      if (failed) {
        setError((failed as any).error ?? 'Failed to save module configuration');
      } else {
        setSuccess('The configuration options have been saved.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save module configuration');
    } finally {
      setSaving(false);
    }
  };

  const grouped = modules.reduce<Record<string, ModuleInfo[]>>((acc, mod) => {
    const pkg = mod.package || 'Other';
    if (!acc[pkg]) acc[pkg] = [];
    acc[pkg].push(mod);
    return acc;
  }, {});

  const packageOrder = ['Core', 'Custom', 'Other'];
  const sortedPackages = Object.keys(grouped).sort(
    (a, b) =>
      (packageOrder.indexOf(a) === -1 ? 99 : packageOrder.indexOf(a)) -
      (packageOrder.indexOf(b) === -1 ? 99 : packageOrder.indexOf(b)),
  );

  return (
    <>
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-gin-s text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 text-gin-green rounded-gin-s text-sm">
          {success}
        </div>
      )}

      <div className="bg-white border border-gin-border rounded-gin overflow-x-auto">
        <table className="w-full text-sm min-w-[500px]">
          <thead>
            <tr className="border-b border-gin-border-table bg-gin-bg-layer2">
              <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider w-16">
                Enabled
              </th>
              <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">
                Name
              </th>
              <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">
                Description
              </th>
              <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider w-24">
                Version
              </th>
              <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider w-24">
                Package
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gin-border-table">
            {sortedPackages.map((pkg) => (
              <React.Fragment key={pkg}>
                <tr className="bg-gin-bg-layer2">
                  <td colSpan={5} className="px-4 py-2 text-[12px] font-semibold text-gin-text-light uppercase tracking-wider">
                    {pkg}
                  </td>
                </tr>
                {grouped[pkg].map((mod) => (
                  <tr key={mod.name} className="hover:bg-gin-primary-light transition-colors">
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={enabledState[mod.name] ?? false}
                        onChange={() => handleToggle(mod.name)}
                        disabled={mod.required}
                        className="h-4 w-4 text-gin-primary rounded border-gin-border-form focus:ring-gin-primary disabled:opacity-50 disabled:cursor-not-allowed"
                        title={mod.required ? 'Required' : undefined}
                      />
                    </td>
                    <td className="px-4 py-3 text-sm text-gin-text">
                      <span className="font-medium text-gin-title">{mod.label}</span>
                      {mod.required && (
                        <span className="ml-2 text-[11px] text-gin-text-light">(required)</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gin-text">
                      {mod.description || '\u2014'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gin-text-light">{mod.version}</td>
                    <td className="px-4 py-3 text-sm text-gin-text-light">{mod.package}</td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>

        <div className="px-4 py-4 border-t border-gin-border">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-gin-primary text-white text-sm font-medium rounded-gin-s hover:bg-gin-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save configuration'}
          </button>
        </div>
      </div>
    </>
  );
}
