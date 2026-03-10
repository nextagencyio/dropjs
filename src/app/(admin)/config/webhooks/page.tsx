import { getWebhooks } from '@/lib/server/data';
import { requirePermission } from '@/lib/server/auth';
import WebhooksClient from './webhooks-client';

export default async function WebhooksPage() {
  await requirePermission('administer site configuration');
  const webhooks = await getWebhooks();

  return <WebhooksClient initialWebhooks={webhooks} />;
}
