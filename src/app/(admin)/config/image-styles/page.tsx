import { getImageStyles } from '@/lib/server/data';
import { requirePermission } from '@/lib/server/auth';
import ImageStylesClient from './image-styles-client';

export default async function ImageStylesPage() {
  await requirePermission('administer image styles');
  const styles = await getImageStyles();

  return <ImageStylesClient initialStyles={styles} />;
}
