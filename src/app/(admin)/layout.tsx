import { requireAuth } from '@/lib/server/auth';
import { AdminShell } from '@/components/admin-shell';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export default async function AdminGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let user;
  try {
    user = await requireAuth();
  } catch (err) {
    console.error('[AdminLayout] requireAuth failed:', err);
    throw err;
  }

  return (
    <AdminShell user={{ uid: user.uid!, name: user.name, email: user.email, roles: user.roles }}>
      {children}
    </AdminShell>
  );
}
