import { requireAuth } from '@/lib/server/auth';
import { exportConfig } from '@/lib/server/data';
import ConfigSyncClient from './config-sync-client';

export default async function ConfigSyncPage() {
  await requireAuth();
  const config = await exportConfig();
  const configJson = JSON.stringify(config, null, 2);
  const configCount = Object.keys(config).length;

  return (
    <ConfigSyncClient
      currentConfigJson={configJson}
      configCount={configCount}
    />
  );
}
