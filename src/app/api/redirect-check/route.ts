import { NextRequest, NextResponse } from 'next/server';
import { ensureInitialized } from '../../../api/init';
import { resolveRedirect } from '../../../core/redirect';

/**
 * Lightweight endpoint for redirect resolution.
 * Called by Next.js middleware to check if a path should be redirected.
 * GET /api/redirect-check?path=/old-page
 */
export async function GET(request: NextRequest) {
  const path = request.nextUrl.searchParams.get('path');
  if (!path) {
    return NextResponse.json({ redirect: null });
  }

  try {
    await ensureInitialized();
    const redirect = await resolveRedirect(path);

    if (redirect) {
      return NextResponse.json({
        redirect: {
          destination: redirect.redirect_path,
          statusCode: redirect.status_code,
        },
      });
    }

    return NextResponse.json({ redirect: null });
  } catch {
    return NextResponse.json({ redirect: null });
  }
}
