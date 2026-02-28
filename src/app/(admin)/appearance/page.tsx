'use client';

import { useState, useEffect } from 'react';
import { Palette, Monitor } from 'lucide-react';
import { fetchThemes, type ThemeInfo } from '@/lib/api-system';

export default function AppearancePage() {
  const [themes, setThemes] = useState<ThemeInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchThemes()
      .then((t) => {
        setThemes(t.filter((theme) => theme.admin));
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load themes');
        setLoading(false);
      });
  }, []);

  return (
    <div>
      <h1 className="text-[28px] font-normal tracking-tight mb-1 text-gin-title">
        Appearance
      </h1>
      <p className="text-gin-text-light text-sm mb-6">
        Manage the visual presentation of your site.
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-gin-s text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="bg-white border border-gin-border rounded-gin p-8 text-center text-gin-text-light">
          Loading...
        </div>
      ) : (
        <div className="space-y-4">
          {themes.map((theme) => (
            <div
              key={theme.name}
              className="bg-white border border-gin-border rounded-gin p-6"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 mt-1">
                  <Monitor className="w-8 h-8 text-gin-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-lg font-semibold text-gin-title">
                      {theme.label}
                    </h2>
                    {theme.default && (
                      <span className="inline-block px-2 py-0.5 text-[11px] font-medium rounded-gin-s bg-green-100 text-gin-green">
                        Active
                      </span>
                    )}
                    <span className="inline-block px-2 py-0.5 text-[11px] font-medium rounded-gin-s bg-gin-primary-light text-gin-primary">
                      Admin theme
                    </span>
                  </div>
                  <p className="text-sm text-gin-text mb-3">
                    {theme.description}
                  </p>
                  <div className="flex gap-6 text-sm text-gin-text-light">
                    <span>
                      Version: <strong className="text-gin-text">{theme.version}</strong>
                    </span>
                    <span>
                      Engine: <strong className="text-gin-text">{theme.engine}</strong>
                    </span>
                    <span>
                      Machine name:{' '}
                      <code className="bg-gin-bg-layer2 px-1.5 py-0.5 rounded-gin-s text-gin-text text-[13px]">
                        {theme.name}
                      </code>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 bg-gin-primary-light border border-gin-border rounded-gin p-4 flex items-center gap-3">
        <Palette className="w-5 h-5 text-gin-primary flex-shrink-0" />
        <p className="text-sm text-gin-primary">
          drop.js uses a decoupled architecture. The admin theme is built with
          React 19 and Tailwind CSS.
        </p>
      </div>
    </div>
  );
}
