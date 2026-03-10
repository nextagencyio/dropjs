import { requirePermission } from '@/lib/server/auth';
import { listUsers, getRoles } from '@/lib/server/data';
import { PeopleActions, type UserRow, type RoleOption } from './_components/people-client';

export default async function PeoplePage() {
  await requirePermission('administer users');

  const [usersResult, rolesResult] = await Promise.all([
    listUsers(),
    getRoles(),
  ]);

  const users: UserRow[] = usersResult.data.map((u) => ({
    uid: u.uid!,
    name: u.name,
    email: u.email,
    status: u.status !== false,
    roles: u.roles,
    created: u.created,
  }));

  const roles: RoleOption[] = rolesResult.map((r) => ({
    name: r.id,
    label: r.label,
  }));

  return (
    <div>
      <PeopleActions users={users} roles={roles} />
    </div>
  );
}
