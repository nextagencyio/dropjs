import Link from 'next/link';
import { getMenus } from '@/lib/server/data';
import { requirePermission } from '@/lib/server/auth';
import { DeleteMenuButton, CreateMenuForm } from './_components/menus-client';

export default async function MenuListPage() {
  await requirePermission('administer menu');
  const menus = await getMenus();

  return (
    <div>
      <nav className="mb-5 flex items-center gap-0">
        <Link href="/structure" className="text-gin-primary hover:underline text-sm">
          Structure
        </Link>
        <span className="text-gin-text-light mx-2">/</span>
        <span className="text-sm text-gin-text-light">Menus</span>
      </nav>

      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[28px] font-normal tracking-tight text-gin-title">Menus</h1>
          <p className="text-gin-text-light text-sm mt-1">
            Manage navigation menus and their links.
          </p>
        </div>
        <CreateMenuForm />
      </div>

      <div className="bg-white border border-gin-border rounded-gin overflow-x-auto">
        <table className="w-full min-w-[500px] text-sm">
          <thead>
            <tr className="bg-gin-bg-layer2 border-b border-gin-border-table">
              <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">Title</th>
              <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">Description</th>
              <th className="text-center px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">Links</th>
              <th className="text-right px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">Operations</th>
            </tr>
          </thead>
          <tbody>
            {menus.map((menu: any) => (
              <tr key={menu.id} className="hover:bg-gin-bg-layer2/50 transition-colors">
                <td className="px-4 py-3 text-sm text-gin-text border-t border-gin-border">
                  <Link
                    href={`/structure/menus/${menu.id}`}
                    className="font-medium text-gin-primary hover:underline"
                  >
                    {menu.label}
                  </Link>
                </td>
                <td className="px-4 py-3 text-sm text-gin-text-light border-t border-gin-border">{menu.description || '\u2014'}</td>
                <td className="px-4 py-3 text-sm text-center text-gin-text-light border-t border-gin-border">{menu.item_count}</td>
                <td className="px-4 py-3 text-sm text-right border-t border-gin-border space-x-3">
                  <Link
                    href={`/structure/menus/${menu.id}`}
                    className="text-sm text-gin-primary hover:underline"
                  >
                    Edit links
                  </Link>
                  {menu.id !== 'main' && (
                    <DeleteMenuButton menuId={menu.id} />
                  )}
                </td>
              </tr>
            ))}
            {menus.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center py-12 text-gin-text-light">
                  No menus configured.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
