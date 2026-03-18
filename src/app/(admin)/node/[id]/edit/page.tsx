import { notFound } from 'next/navigation';
import { loadEntity, getEntityAuditEntries } from '@/lib/server/data';
import { getSessionUser } from '@/lib/server/auth';
import { userHasPermission } from '../../../../../auth/access';
import { ensureInitialized } from '../../../../../api/init';
import { db } from '../../../../../db/index';
import { getScheduledTransition } from '../../../../../core/scheduler';
import { NodeEditForm } from './node-edit-form';

export default async function NodeEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const nid = parseInt(id, 10);

  const entity = await loadEntity('node', nid);
  if (!entity) notFound();

  const bundle = entity.type as string;
  const bundleLabel = bundle.replace(/[_-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  const user = await getSessionUser();
  const isAdmin = user ? await userHasPermission(user, 'administer nodes') : false;

  await ensureInitialized();

  // Fetch revision count
  let revisionCount = 0;
  try {
    const rows = await db.select('node_revision').fields(['vid']).condition('nid', nid).execute<{ vid: number }>();
    revisionCount = rows.length;
  } catch { /* table may not exist */ }

  // Fetch recent audit log entries
  let auditEntries: { action: string; uid: number; timestamp: number; changes: string | null }[] = [];
  try {
    const entries = await getEntityAuditEntries('node', nid, { limit: 5 });
    auditEntries = entries.map(e => ({
      action: e.action,
      uid: e.uid ?? 0,
      timestamp: e.timestamp ?? 0,
      changes: e.changes ?? null,
    }));
  } catch { /* audit table may not exist */ }

  // Fetch scheduled transition
  let schedule: { transition: string; scheduled_date: string } | null = null;
  try {
    const s = await getScheduledTransition('node', nid);
    if (s) schedule = { transition: s.transition, scheduled_date: s.scheduled_date };
  } catch { /* ignore */ }

  return (
    <NodeEditForm
      id={nid}
      bundle={bundle}
      bundleLabel={bundleLabel}
      isAdmin={isAdmin}
      revisionCount={revisionCount}
      auditEntries={auditEntries}
      schedule={schedule}
    />
  );
}
