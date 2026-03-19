import { getRedirects } from '@/lib/server/data';
import { requirePermission } from '@/lib/server/auth';
import RedirectsClient from './redirects-client';

export default async function RedirectsPage() {
  await requirePermission('administer redirects');
  const { redirects, total } = await getRedirects({ limit: 100 });

  return <RedirectsClient initialRedirects={redirects} initialTotal={total} />;
}
