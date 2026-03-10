import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requirePermission } from '@/lib/server/auth';
import { getRolePermissions } from '@/lib/server/data';
import { PermissionsForm } from './_components/permissions-client';

export default async function RolePermissionsPage({
  params,
}: {
  params: Promise<{ role: string }>;
}) {
  await requirePermission('administer permissions');

  const { role } = await params;
  const data = await getRolePermissions(role);

  if (!data) {
    notFound();
  }

  return (
    <div>
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-2">
          <Link
            href="/people/roles"
            className="text-sm text-gin-primary hover:underline"
          >
            Roles
          </Link>
          <span className="text-gin-text-light">/</span>
          <span className="text-sm text-gin-text-light">Permissions</span>
        </div>
        <h1 className="text-[28px] font-normal tracking-tight text-gin-title">
          Permissions for {data.role.label}
        </h1>
      </div>

      <PermissionsForm
        roleName={data.role.name}
        roleLabel={data.role.label}
        initialPermissions={data.permissions}
        allPermissions={data.allPermissions}
      />
    </div>
  );
}
