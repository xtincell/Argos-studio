// Who reads the library (ADR-0010). Anonymous readers get the public scope; the administration
// key — `Authorization: Bearer` for a server client, or the session opened at /admin/login for
// a browser — widens a read to the private dossiers. A missing, refused or expired key is simply
// anonymous: a private dossier then answers exactly like an unknown one.

import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import type { ReadScope } from '@/lib/visibility';
import { ADMIN_SESSION_COOKIE, carriesAdminKey, hasAdminSession } from '@/server/admin-access';

export type { ReadScope } from '@/lib/visibility';

/** Scope of an API request. */
export function requestReadScope(request: NextRequest): ReadScope {
  return carriesAdminKey(request) ? 'admin' : 'public';
}

/** Scope of a page: browsers carry the key as the HttpOnly session cookie only. */
export async function pageReadScope(): Promise<ReadScope> {
  const session = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;
  return hasAdminSession(session) ? 'admin' : 'public';
}

/**
 * Response headers of a read whose content depends on its reader. A shared cache keys the
 * response on the credentials; a response read with the key is never stored.
 */
export function scopeHeaders(scope: ReadScope, headers: Record<string, string> = {}): Record<string, string> {
  return {
    ...headers,
    Vary: 'Authorization, Cookie',
    ...(scope === 'admin' ? { 'Cache-Control': 'private, no-store' } : {}),
  };
}

/** `NextResponse.json` for a scoped read. */
export function scopedJson<T>(body: T, scope: ReadScope, init: { status?: number; headers?: Record<string, string> } = {}) {
  return NextResponse.json(body, { status: init.status, headers: scopeHeaders(scope, init.headers) });
}
