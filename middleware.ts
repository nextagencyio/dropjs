import { NextResponse } from 'next/server';
import NextAuth from 'next-auth';
import authConfig from './auth.config';

const { auth } = NextAuth(authConfig);

export default auth(async (req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;

  // Protect all admin routes (everything under (admin) group which is at root like /content, /people, etc.)
  // The admin layout already checks auth server-side, but middleware gives a faster redirect
  const adminPaths = [
    '/content', '/people', '/roles', '/structure', '/config',
    '/appearance', '/extend', '/media', '/reports',
  ];
  const isAdminRoute = adminPaths.some((p) => pathname === p || pathname.startsWith(p + '/'));
  // Also protect the root / which is the admin dashboard
  const isDashboard = pathname === '/';

  if ((isAdminRoute || isDashboard) && !isLoggedIn) {
    return Response.redirect(new URL('/login', req.nextUrl));
  }

  // Redirect authenticated users away from login page
  if (pathname === '/login' && isLoggedIn) {
    return Response.redirect(new URL('/', req.nextUrl));
  }

  // Check URL redirects for public-facing paths
  if (!isAdminRoute && !isDashboard && pathname !== '/login') {
    try {
      const checkUrl = new URL('/api/redirect-check', req.nextUrl.origin);
      checkUrl.searchParams.set('path', pathname);
      const res = await fetch(checkUrl, { headers: { 'x-internal': '1' } });
      if (res.ok) {
        const { redirect } = await res.json();
        if (redirect?.destination) {
          const dest = redirect.destination.startsWith('http')
            ? redirect.destination
            : new URL(redirect.destination, req.nextUrl.origin).toString();
          return NextResponse.redirect(dest, redirect.statusCode || 301);
        }
      }
    } catch {
      // Don't block the request if redirect check fails
    }
  }
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon\\.ico|favicon\\.png|logo\\.png|.*\\.css|.*\\.js).*)'],
};
