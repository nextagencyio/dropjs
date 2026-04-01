import Link from 'next/link';
import { getModules } from '@/lib/server/data';

export default async function AvailableUpdatesPage() {
  const modules = await getModules();

  return (
    <div>
      <div className="mb-5">
        <Link
          href="/reports"
          className="text-sm text-gin-primary hover:underline"
        >
          Reports
        </Link>
        <span className="text-gin-text-light mx-2">/</span>
        <span className="text-sm text-gin-text-light">Available updates</span>
      </div>

      <h1 className="text-[28px] font-normal tracking-tight mb-1 text-gin-title">
        Available updates
      </h1>
      <p className="text-sm text-gin-text-light mb-6">
        Check the status of installed modules and the drop.js framework.
      </p>

      {/* Core version */}
      <div className="bg-white border border-gin-border rounded-gin overflow-x-auto mb-6">
        <table className="w-full text-sm min-w-[500px]">
          <thead>
            <tr className="border-b border-gin-border-table bg-gin-bg-layer2">
              <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">
                Package
              </th>
              <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider w-32">
                Installed
              </th>
              <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider w-40">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gin-border-table">
            <tr className="hover:bg-gin-primary-light transition-colors">
              <td className="px-4 py-3 font-medium text-gin-title">
                drop.js (core)
              </td>
              <td className="px-4 py-3 text-gin-text font-mono text-xs">
                0.1.0
              </td>
              <td className="px-4 py-3">
                <span className="inline-block px-2 py-0.5 rounded-gin-s text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Up to date
                </span>
              </td>
            </tr>
            <tr className="hover:bg-gin-primary-light transition-colors">
              <td className="px-4 py-3 font-medium text-gin-title">
                Next.js
              </td>
              <td className="px-4 py-3 text-gin-text font-mono text-xs">
                15
              </td>
              <td className="px-4 py-3">
                <span className="inline-block px-2 py-0.5 rounded-gin-s text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Up to date
                </span>
              </td>
            </tr>
            <tr className="hover:bg-gin-primary-light transition-colors">
              <td className="px-4 py-3 font-medium text-gin-title">
                Node.js
              </td>
              <td className="px-4 py-3 text-gin-text font-mono text-xs">
                {process.version}
              </td>
              <td className="px-4 py-3">
                <span className="inline-block px-2 py-0.5 rounded-gin-s text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Up to date
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Installed modules */}
      <h2 className="text-lg font-semibold text-gin-title mb-4">
        Installed modules
      </h2>
      <div className="bg-white border border-gin-border rounded-gin overflow-x-auto">
        <table className="w-full text-sm min-w-[500px]">
          <thead>
            <tr className="border-b border-gin-border-table bg-gin-bg-layer2">
              <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">
                Module
              </th>
              <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider w-32">
                Version
              </th>
              <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider w-24">
                Enabled
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gin-border-table">
            {modules.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-gin-text-light">
                  No modules installed.
                </td>
              </tr>
            ) : (
              modules.map((mod) => (
                <tr key={mod.name} className="hover:bg-gin-primary-light transition-colors">
                  <td className="px-4 py-3 font-medium text-gin-title">
                    {mod.label || mod.name}
                  </td>
                  <td className="px-4 py-3 text-gin-text font-mono text-xs">
                    {mod.version || '0.1.0'}
                  </td>
                  <td className="px-4 py-3">
                    {mod.enabled ? (
                      <span className="inline-block px-2 py-0.5 rounded-gin-s text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Yes
                      </span>
                    ) : (
                      <span className="inline-block px-2 py-0.5 rounded-gin-s text-[11px] font-medium bg-gray-50 text-gray-500 border border-gray-200">
                        No
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
