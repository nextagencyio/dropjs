import { notFound } from 'next/navigation';
import { getMenuDetail } from '@/lib/server/data';
import { requirePermission } from '@/lib/server/auth';
import MenuEditClient from './_components/menu-edit-client';

export default async function MenuEditPage({
  params,
}: {
  params: Promise<{ menuId: string }>;
}) {
  await requirePermission('administer menu');
  const { menuId } = await params;
  const menu = await getMenuDetail(menuId);
  if (!menu) notFound();

  return <MenuEditClient menu={menu} />;
}
