// Administration pages answer only to an open session (single key, arbitrage 5.8).
// A browser without session is sent to the login page before any rendering, with a real
// HTTP redirect; each page keeps its own server check as well (src/server/admin-page.ts).
// API routes check the key or the session themselves (src/server/admin-access.ts).

import { NextResponse, type NextRequest } from 'next/server';
import { ADMIN_SESSION_COOKIE, hasAdminSession, safeAdminPath } from '@/server/admin-access';

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const open = hasAdminSession(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
  if (pathname === '/admin/login') {
    if (!open) return noStore(NextResponse.next());
    const next = safeAdminPath(request.nextUrl.searchParams.get('next'));
    return redirect(request, next);
  }
  if (open) return noStore(NextResponse.next());
  return redirect(request, `/admin/login?${new URLSearchParams({ next: safeAdminPath(`${pathname}${search}`) }).toString()}`);
}

/**
 * Next requires an absolute Location from middleware, and its own request URL carries the
 * internal listening host of the standalone server. Behind the TLS proxy the public address
 * is the one the proxy forwards.
 */
function publicUrl(request: NextRequest, path: string): URL {
  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const host = forwardedHost || request.headers.get('host') || request.nextUrl.host;
  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
  const protocol = forwardedProto === 'https' || (!forwardedProto && request.nextUrl.protocol === 'https:') ? 'https' : 'http';
  try {
    return new URL(path, `${protocol}://${host}`);
  } catch {
    return new URL(path, request.nextUrl.origin);
  }
}

function redirect(request: NextRequest, location: string) {
  const response = NextResponse.redirect(publicUrl(request, location), 303);
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

function noStore(response: NextResponse) {
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return response;
}

export const config = {
  matcher: ['/admin', '/admin/:path*'],
  // node:crypto verifies the session signature (stable Node.js middleware, Next 15.5).
  runtime: 'nodejs',
};
