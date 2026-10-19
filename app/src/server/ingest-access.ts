import { createHash, timingSafeEqual } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';

/** One editorial-library write credential, matching the existing Studio Bearer contract.
 * No account, provider, session or private-consultation access is created here. */
export function requireIngestAccess(request: NextRequest): NextResponse | null {
  const configured = process.env.ARGOS_INGEST_API_KEY;
  if (!configured || configured.length < 24) {
    return NextResponse.json({ ok: false, error: 'INGEST_NOT_CONFIGURED', message: 'L’accès aux écritures doit être configuré sur cette bibliothèque.' }, { status: 503 });
  }
  const origin = request.headers.get('origin');
  const expected = new URL(process.env.NEXT_PUBLIC_SITE_URL || request.url).origin;
  if (origin && origin !== expected) {
    return NextResponse.json({ ok: false, error: 'ORIGIN_REFUSED', message: 'Ouvrez l’admission depuis cette bibliothèque.' }, { status: 403 });
  }
  const auth = request.headers.get('authorization');
  const supplied = auth?.startsWith('Bearer ') ? auth.slice(7) : '';
  const digest = (value: string) => createHash('sha256').update(value).digest();
  if (!supplied || !timingSafeEqual(digest(supplied), digest(configured))) {
    return NextResponse.json({ ok: false, error: 'INGEST_UNAUTHORIZED', message: 'La clé d’admission est absente ou refusée.' }, { status: 401 });
  }
  return null;
}
