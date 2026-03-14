'use client';

import { SessionProvider, useSession, signOut } from 'next-auth/react';
import type { ReactNode } from 'react';

export function AuthProvider({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}

/**
 * Backward-compatible useAuth hook that wraps next-auth's useSession.
 * Used by public-facing components (nav, comments, edit link).
 */
export function useAuth() {
  const { data: session, status } = useSession();

  return {
    user: session?.user
      ? {
          uid: session.user.uid,
          name: session.user.name ?? '',
          email: session.user.email ?? '',
          roles: session.user.roles,
        }
      : null,
    isAuthenticated: !!session,
    loading: status === 'loading',
    logout: () => signOut({ callbackUrl: '/login' }),
  };
}
