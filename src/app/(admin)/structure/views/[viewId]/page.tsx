import { notFound } from 'next/navigation';
import { getView, getEntityType, getEntityTypesFor } from '@/lib/server/data';
import { requirePermission } from '@/lib/server/auth';
import ViewEditClient from './_components/view-edit-client';

export default async function ViewEditPage({
  params,
}: {
  params: Promise<{ viewId: string }>;
}) {
  await requirePermission('administer views');
  const { viewId } = await params;
  const view = await getView(viewId);
  if (!view) notFound();

  // Gather available fields for this entity type
  const availableFields: { name: string; label: string; type: string }[] = [];
  const baseFields = ['title', 'status', 'created', 'changed', 'uid', 'langcode', 'promote', 'sticky'];
  for (const name of baseFields) {
    availableFields.push({ name, label: name.charAt(0).toUpperCase() + name.slice(1).replace(/_/g, ' '), type: 'string' });
  }
  // Add bundle-specific fields
  const bundles = await getEntityTypesFor(view.entity_type);
  const seenFields = new Set(baseFields);
  for (const bundle of bundles) {
    if (view.bundle && bundle.bundle !== view.bundle) continue;
    for (const [name, def] of Object.entries(bundle.fields || {})) {
      if (!seenFields.has(name)) {
        seenFields.add(name);
        availableFields.push({ name, label: def.label || name, type: def.type || 'string' });
      }
    }
  }

  return <ViewEditClient view={view} availableFields={availableFields} />;
}
