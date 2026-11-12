// GET /api/v1/references/{slug} — returns a single Reference with full payload.
// `?format=dossier` returns its canonical research dossier, without the researcher's contact.
//
// A private dossier (ADR-0010) is read with the administration key only. Without it, the answer
// is exactly the one of an unknown slug: same status, headers and body.

import type { NextRequest } from 'next/server';
import { getReferenceBySlug, getSourceDossier } from '@/lib/library';
import { requestReadScope, scopedJson } from '@/server/read-scope';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const scope = requestReadScope(request);
  const { slug } = await params;
  const notFound = () => scopedJson(
    { ok: false, error: 'NOT_FOUND', message: `No reference with slug "${slug}"` },
    scope,
    { status: 404 },
  );
  if (request.nextUrl.searchParams.get('format') === 'dossier') {
    const read = await getSourceDossier(slug, scope);
    if (!read) return notFound();
    if (read.status === 'unavailable') return scopedJson({ ok: false, error: 'SOURCE_DOSSIER_UNAVAILABLE', message: 'Le dossier d’origine n’est pas conservé pour cette ancienne référence.' }, scope, { status: 409 });
    return scopedJson(read.dossier, scope, { headers: {
      'Content-Disposition': `attachment; filename="argos-${slug}.json"`,
      'Cache-Control': 'no-store', ETag: JSON.stringify(read.updatedAt),
      'X-Argos-Visibility': read.visibility,
    } });
  }
  const reference = await getReferenceBySlug(slug, scope);
  if (!reference) return notFound();
  return scopedJson({ data: reference }, scope);
}
