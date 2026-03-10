import { getTextFormats } from '@/lib/server/data';
import { requirePermission } from '@/lib/server/auth';
import TextFormatsClient from './text-formats-client';

export default async function TextFormatsPage() {
  await requirePermission('administer filters');
  const formats = await getTextFormats();

  return <TextFormatsClient initialFormats={formats} />;
}
