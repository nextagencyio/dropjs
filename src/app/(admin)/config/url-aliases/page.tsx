import { getAliases } from '@/lib/server/data';
import { requirePermission } from '@/lib/server/auth';
import UrlAliasesClient from './url-aliases-client';

export default async function UrlAliasesPage() {
  await requirePermission('administer url aliases');
  const { aliases, total } = await getAliases();

  return <UrlAliasesClient initialAliases={aliases} initialTotal={total} />;
}
