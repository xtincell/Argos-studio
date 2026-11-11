// POST /api/admin/login — opens a browser administration session with the single key.
//
// A browser form (`application/x-www-form-urlencoded`) is answered by a 303 redirect: back to
// the requested administration page, or to the login page with a readable refusal. A JSON
// client receives JSON (200, 401, 403 or 503). The key itself is never stored in the cookie.

import { NextResponse, type NextRequest } from 'next/server';
import {
  configuredAdminKey,
  createAdminSession,
  isAdminKey,
  legacyKeyIgnored,
  requestOrigin,
  safeAdminPath,
  sessionCookie,
} from '@/server/admin-access';

const MAX_BODY_BYTES = 4096;
/** Refusal codes as worded by the login page (`?erreur=`). */
const LOGIN_PAGE_ERRORS: Record<string, string> = {
  ADMIN_NOT_CONFIGURED: 'fermee',
  ORIGIN_REFUSED: 'origine',
  ADMIN_UNAUTHORIZED: 'cle',
};

/** Reads at most `limit` bytes of the body; null beyond, without buffering the rest. */
async function readBounded(request: NextRequest, limit: number): Promise<string | null> {
  const reader = request.body?.getReader();
  if (!reader) return '';
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString('utf8');
}

function backToLogin(error: string, next: string) {
  const location = `/admin/login?${new URLSearchParams({ erreur: error, next }).toString()}`;
  return new NextResponse(null, { status: 303, headers: { Location: location, 'Cache-Control': 'no-store' } });
}

export async function POST(request: NextRequest) {
  const isJson = (request.headers.get('content-type') ?? '').includes('application/json');
  const refuse = (status: number, error: string, message: string, next = '/admin/ingest') =>
    isJson
      ? NextResponse.json({ ok: false, error, message }, { status, headers: { 'Cache-Control': 'no-store' } })
      : backToLogin(LOGIN_PAGE_ERRORS[error] ?? 'formulaire', next);

  const key = configuredAdminKey();
  if (!key) {
    if (legacyKeyIgnored()) console.warn('[argos] ARGOS_INGEST_API_KEY est ignorée : renommez-la ARGOS_ADMIN_KEY.');
    return refuse(503, 'ADMIN_NOT_CONFIGURED', 'L’administration de cette bibliothèque est fermée : aucune clé n’est configurée sur le serveur.');
  }
  if (requestOrigin(request) === 'foreign') {
    return refuse(403, 'ORIGIN_REFUSED', 'Ouvrez l’administration depuis cette bibliothèque.');
  }
  const declaredLength = Number(request.headers.get('content-length') ?? '0');
  if (declaredLength > MAX_BODY_BYTES) return refuse(413, 'BODY_TOO_LARGE', 'Demande de connexion trop volumineuse.');

  let supplied: unknown;
  let next: unknown;
  try {
    const text = await readBounded(request, MAX_BODY_BYTES);
    if (text === null) return refuse(413, 'BODY_TOO_LARGE', 'Demande de connexion trop volumineuse.');
    if (isJson) {
      const body = JSON.parse(text) as { key?: unknown; next?: unknown };
      supplied = body.key;
      next = body.next;
    } else {
      const form = new URLSearchParams(text);
      supplied = form.get('key');
      next = form.get('next');
    }
  } catch {
    return refuse(400, 'INVALID_BODY', 'Demande de connexion illisible.');
  }
  const destination = safeAdminPath(next);
  if (!isAdminKey(typeof supplied === 'string' ? supplied : null, key)) {
    return refuse(401, 'ADMIN_UNAUTHORIZED', 'La clé d’administration est refusée.', destination);
  }

  const session = createAdminSession(key);
  const response = isJson
    ? NextResponse.json({ ok: true, expiresAt: session.expiresAt.toISOString() }, { headers: { 'Cache-Control': 'no-store' } })
    : new NextResponse(null, { status: 303, headers: { Location: destination, 'Cache-Control': 'no-store' } });
  response.cookies.set(sessionCookie(session.value));
  return response;
}
