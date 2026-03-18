import Link from 'next/link';
import { ensureInitialized } from '../../../../api/init';
import { getUpcomingScheduledTransitions } from '../../../../core/scheduler';
import { Entity } from '../../../../core/entity';
import { CancelScheduleButton } from './cancel-button';

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString();
}

export default async function ScheduledContentPage() {
  await ensureInitialized();

  const transitions = await getUpcomingScheduledTransitions(100);

  // Load entity titles
  const enriched = await Promise.all(
    transitions.map(async (t) => {
      let title = `${t.entity_type} #${t.entity_id}`;
      try {
        const entity = await Entity.load(t.entity_type, t.entity_id);
        if (entity) {
          const json = entity.toJSON();
          title = (json.title as string) || title;
        }
      } catch { /* ignore */ }
      return { ...t, title };
    }),
  );

  return (
    <div>
      <div className="mb-5">
        <Link href="/content" className="text-sm text-gin-primary hover:underline">
          Content
        </Link>
        <span className="text-gin-text-light mx-2">/</span>
        <span className="text-sm text-gin-text-light">Scheduled</span>
      </div>

      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[28px] font-normal tracking-tight text-gin-title">
            Scheduled Content
          </h1>
          <p className="text-sm text-gin-text-light mt-1">
            Content scheduled for future publishing or unpublishing.
          </p>
        </div>
      </div>

      {enriched.length === 0 ? (
        <div className="bg-white border border-gin-border rounded-gin p-8 text-center text-gin-text-light">
          No scheduled transitions found.
        </div>
      ) : (
        <div className="bg-white border border-gin-border rounded-gin overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="border-b border-gin-border-table bg-gin-bg-layer2">
                <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">
                  Title
                </th>
                <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider w-28">
                  Type
                </th>
                <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider w-28">
                  Transition
                </th>
                <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider w-44">
                  Scheduled Date
                </th>
                <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider w-44">
                  Created
                </th>
                <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider w-28">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gin-border-table">
              {enriched.map((t) => (
                <tr key={`${t.entity_type}:${t.entity_id}`} className="hover:bg-gin-primary-light transition-colors">
                  <td className="px-4 py-3 text-sm">
                    <Link
                      href={`/node/${t.entity_id}/edit`}
                      className="text-gin-primary hover:underline font-medium"
                    >
                      {t.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-gin-text-light">
                    {t.entity_type}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-gin-s text-[11px] font-medium ${
                        t.transition === 'publish'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {t.transition === 'publish' ? 'Publish' : 'Unpublish'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gin-text-light whitespace-nowrap">
                    {formatDate(t.scheduled_date)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gin-text-light whitespace-nowrap">
                    {formatDate(t.created)}
                  </td>
                  <td className="px-4 py-3">
                    <CancelScheduleButton
                      entityType={t.entity_type}
                      entityId={t.entity_id}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
