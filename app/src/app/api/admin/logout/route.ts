// POST /api/admin/logout — closes the browser administration session on this browser.
//
// The session is stateless: closing it removes the cookie here. Ending every session at once
// is done by rotating ARGOS_ADMIN_KEY on the server.

import { NextResponse, type NextRequest } from 'next/server';
import { clearedSessionCookie, requestOrigin } from '@/server/admin-access';

export async function POST(request: NextRequest) {
  const isJson = (request.headers.get('content-type') ?? '').includes('application/json');
  if (requestOrigin(request) === 'foreign') {
    return NextResponse.json(
      { ok: false, error: 'ORIGIN_REFUSED', message: 'Ouvrez l’administration depuis cette bibliothèque.' },
      { status: 403, headers: { 'Cache-Control': 'no-store' } },
    );
  }
  const response = isJson
    ? NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
    : new NextResponse(null, { status: 303, headers: { Location: '/admin/login?sortie=1', 'Cache-Control': 'no-store' } });
  response.cookies.set(clearedSessionCookie());
  return response;
}
