import { requireAuth } from '@/lib/server/auth';
import UserEditClient from './user-edit-client';

export default async function UserEditPage() {
  const user = await requireAuth();

  return (
    <UserEditClient
      uid={user.uid!}
      name={user.name}
      email={user.email}
      roles={user.roles ?? []}
    />
  );
}
