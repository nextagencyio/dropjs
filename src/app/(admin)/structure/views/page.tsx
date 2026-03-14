import Link from 'next/link';
import { getViews } from '@/lib/server/data';
import { requirePermission } from '@/lib/server/auth';
import { DeleteViewButton, CreateViewForm } from './_components/views-client';

export default async function ViewsListPage() {
  await requirePermission('administer views');
  const views = await getViews();

  return (
    <div>
      <nav className="mb-5 flex items-center gap-0">
        <Link href="/structure" className="text-gin-primary hover:underline text-sm">Structure</Link>
        <span className="text-gin-text-light mx-2">/</span>
        <span className="text-sm text-gin-text-light">Views</span>
      </nav>

      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[28px] font-normal tracking-tight text-gin-title">Views</h1>
          <p className="text-sm text-gin-text-light mt-1">Configurable entity list builders</p>
        </div>
        <CreateViewForm />
      </div>

      <div className="bg-white border border-gin-border rounded-gin overflow-x-auto">
        <table className="w-full text-sm min-w-[500px]">
          <thead>
            <tr className="bg-gin-bg-layer2 border-b border-gin-border-table">
              <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">View name</th>
              <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">Machine name</th>
              <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">Entity type</th>
              <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">Status</th>
              <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">Operations</th>
            </tr>
          </thead>
          <tbody>
            {views.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-gin-text-light">
                  No views configured. Click &quot;Add view&quot; to create one.
                </td>
              </tr>
            ) : (
              views.map((view) => (
                <tr key={view.id} className="hover:bg-gin-bg-layer2/50 transition-colors">
                  <td className="px-4 py-3 text-sm text-gin-text border-t border-gin-border">
                    <Link href={`/structure/views/${view.id}`} className="text-gin-primary hover:underline font-medium">
                      {view.label}
                    </Link>
                    {view.description && (
                      <p className="text-[12px] text-gin-text-light mt-0.5">{view.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm border-t border-gin-border">
                    <code className="text-xs bg-gin-bg-layer2 px-1.5 py-0.5 rounded-gin-s text-gin-text">{view.id}</code>
                  </td>
                  <td className="px-4 py-3 text-sm text-gin-text-light border-t border-gin-border">{view.entity_type}</td>
                  <td className="px-4 py-3 text-sm border-t border-gin-border">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      view.status ? 'bg-emerald-50 text-gin-green' : 'bg-gray-100 text-gin-text-light'
                    }`}>
                      {view.status ? 'Enabled' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm border-t border-gin-border">
                    <div className="flex gap-3">
                      <Link href={`/structure/views/${view.id}`} className="text-sm text-gin-primary hover:underline">
                        Edit
                      </Link>
                      <DeleteViewButton viewId={view.id} />
                    </div>
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
