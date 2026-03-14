'use client';

import { useState } from 'react';
import { setDefaultTheme, setAdminTheme } from '@/app/(admin)/_actions/system';

interface ThemeInfo {
  name: string;
  machine_name: string;
  description: string;
  version: string;
  engine: string;
  admin: boolean;
  regions: Record<string, string>;
  screenshot: string | null;
  is_default: boolean;
  is_admin: boolean;
}

interface ThemeConfig {
  default: string;
  admin: string;
}

interface ThemeListProps {
  themes: ThemeInfo[];
  config: ThemeConfig;
}

export default function ThemeList({ themes, config }: ThemeListProps) {
  const [currentConfig, setCurrentConfig] = useState(config);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSetDefault = async (machineName: string) => {
    setSaving(machineName);
    setError('');
    setSuccess('');

    try {
      const result = await setDefaultTheme(machineName);
      if (!result.success) {
        setError(result.error || 'Failed to set default theme');
      } else {
        setCurrentConfig(prev => ({ ...prev, default: machineName }));
        setSuccess(`Default theme has been set to ${themes.find(t => t.machine_name === machineName)?.name ?? machineName}.`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set default theme');
    } finally {
      setSaving(null);
    }
  };

  const handleSetAdmin = async (machineName: string) => {
    setSaving(`admin-${machineName}`);
    setError('');
    setSuccess('');

    try {
      const result = await setAdminTheme(machineName);
      if (!result.success) {
        setError(result.error || 'Failed to set admin theme');
      } else {
        setCurrentConfig(prev => ({ ...prev, admin: machineName }));
        setSuccess(`Administration theme has been set to ${themes.find(t => t.machine_name === machineName)?.name ?? machineName}.`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set admin theme');
    } finally {
      setSaving(null);
    }
  };

  return (
    <>
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

      <div className="space-y-4">
        {themes.map((theme) => {
          const isDefault = theme.machine_name === currentConfig.default;
          const isAdmin = theme.machine_name === currentConfig.admin;

          return (
            <div
              key={theme.machine_name}
              className="bg-white border border-gin-border rounded-gin-l overflow-hidden"
            >
              <div className="flex gap-6 p-6">
                {/* Screenshot */}
                <div className="shrink-0 w-[220px] h-[165px] bg-gin-bg-layer2 rounded-gin-s border border-gin-border overflow-hidden flex items-center justify-center">
                  {theme.screenshot ? (
                    <img
                      src={theme.screenshot}
                      alt={`${theme.name} screenshot`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-gin-text-light text-sm">No screenshot</div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-lg font-semibold text-gin-title">{theme.name}</h2>
                    <span className="text-sm text-gin-text-light">{theme.version}</span>
                    {isDefault && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gin-primary text-white">
                        Default theme
                      </span>
                    )}
                    {isAdmin && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-600 text-white">
                        Administration theme
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-gin-text mb-3">{theme.description}</p>

                  <dl className="text-sm text-gin-text-light space-y-1 mb-4">
                    <div className="flex gap-2">
                      <dt className="font-medium text-gin-text">Engine:</dt>
                      <dd>{theme.engine}</dd>
                    </div>
                    {Object.keys(theme.regions).length > 0 && (
                      <div className="flex gap-2">
                        <dt className="font-medium text-gin-text">Regions:</dt>
                        <dd>{Object.values(theme.regions).join(', ')}</dd>
                      </div>
                    )}
                  </dl>

                  <div className="flex gap-2">
                    {!isDefault && (
                      <button
                        onClick={() => handleSetDefault(theme.machine_name)}
                        disabled={saving !== null}
                        className="px-4 py-2 bg-gin-primary hover:bg-gin-primary-hover text-white text-sm font-medium rounded-gin-s disabled:opacity-50 transition-colors"
                      >
                        {saving === theme.machine_name ? 'Setting...' : 'Set as default'}
                      </button>
                    )}
                    {!isAdmin && theme.admin && (
                      <button
                        onClick={() => handleSetAdmin(theme.machine_name)}
                        disabled={saving !== null}
                        className="px-4 py-2 bg-white border border-gin-border text-gin-text text-sm font-medium rounded-gin-s hover:bg-gin-bg-layer2 disabled:opacity-50 transition-colors"
                      >
                        {saving === `admin-${theme.machine_name}` ? 'Setting...' : 'Set as admin theme'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {themes.length === 0 && (
          <div className="bg-white border border-gin-border rounded-gin-l p-8 text-center text-gin-text-light">
            No themes found. Place themes in the <code className="bg-gin-bg-layer2 px-1.5 py-0.5 rounded text-sm">themes/</code> directory with a <code className="bg-gin-bg-layer2 px-1.5 py-0.5 rounded text-sm">theme.info.yml</code> file.
          </div>
        )}
      </div>
    </>
  );
}
