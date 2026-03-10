import { getShortcuts } from '@/lib/server/data';
import { requireAuth } from '@/lib/server/auth';
import ShortcutsClient from './shortcuts-client';

export default async function ShortcutsPage() {
  const user = await requireAuth();
  const shortcuts = await getShortcuts(user.uid!);
  const sorted = [...shortcuts].sort((a, b) => a.weight - b.weight);

  return <ShortcutsClient initialShortcuts={sorted} />;
}
