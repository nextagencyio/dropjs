'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

export function EditLink({ nid }: { nid: number }) {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <Link href={`/node/${nid}/edit`} className="text-gin-primary hover:underline">
      Edit
    </Link>
  );
}
