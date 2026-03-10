import { getSiteConfig } from '@/lib/server/data';
import { requirePermission } from '@/lib/server/auth';
import SiteConfigForm from './site-config-form';

export default async function SiteConfigPage() {
  await requirePermission('administer site configuration');
  const config = await getSiteConfig();

  return <SiteConfigForm initialConfig={config} />;
}
