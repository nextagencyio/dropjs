import { getLanguagesList } from '@/lib/server/data';
import { requirePermission } from '@/lib/server/auth';
import LanguagesClient from './languages-client';

export default async function LanguagesPage() {
  await requirePermission('administer languages');
  const languages = await getLanguagesList();

  return <LanguagesClient initialLanguages={languages} />;
}
