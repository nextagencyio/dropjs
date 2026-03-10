import { getModules } from '@/lib/server/data';
import ModuleTable from './module-table';

export default async function ExtendPage() {
  const modules = await getModules();

  return (
    <div>
      <h1 className="text-[28px] font-normal tracking-tight mb-1 text-gin-title">
        Extend
      </h1>
      <p className="text-gin-text-light text-sm mb-6">
        Enable and disable modules to extend site functionality.
      </p>

      <ModuleTable modules={modules} />
    </div>
  );
}
