import { requireAuth } from '@/lib/server/auth';
import { getCronJobsList } from '@/lib/server/data';
import CronManagementClient from './cron-management-client';

export default async function CronManagementPage() {
  await requireAuth();
  const jobs = await getCronJobsList();

  return <CronManagementClient jobs={jobs} />;
}
