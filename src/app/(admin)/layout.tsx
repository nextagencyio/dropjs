import { requireAuth } from '@/lib/server/auth';
import { AdminShell } from '@/components/admin-shell';

export default async function AdminGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth();

  return (
    <AdminShell user={{ uid: user.uid!, name: user.name, email: user.email, roles: user.roles }}>
      {children}
    </AdminShell>
  );
}
