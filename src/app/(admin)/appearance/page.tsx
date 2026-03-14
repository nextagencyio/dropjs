import { getThemes } from '@/lib/server/data';
import { requirePermission } from '@/lib/server/auth';
import ThemeList from './theme-list';

export default async function AppearancePage() {
  await requirePermission('administer themes');
  const { themes, config } = await getThemes();

  return (
    <div>
      <h1 className="text-[28px] font-normal tracking-tight mb-1 text-gin-title">
        Appearance
      </h1>
      <p className="text-gin-text-light text-sm mb-6">
        Select and configure your themes. The default theme is used for the public-facing site.
        The administration theme is used for administrative pages.
      </p>

      <ThemeList themes={themes} config={config} />
    </div>
  );
}
