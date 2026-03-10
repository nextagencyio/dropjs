import { requirePermission } from '@/lib/server/auth';
import { getRoles } from '@/lib/server/data';
import { RolesActions, type RoleRow } from './_components/roles-client';

export default async function RolesPage() {
  await requirePermission('administer permissions');

  const rolesData = await getRoles();

  const roles: RoleRow[] = rolesData.map((r) => ({
    name: r.id,
    label: r.label,
  }));

  return (
    <div>
      <RolesActions roles={roles} />
    </div>
  );
}
