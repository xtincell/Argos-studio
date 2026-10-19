// GET /api/v1/references/{slug} — returns a single Reference with full payload.

import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { ResearchDossierSchema } from '@/lib/research-dossier';
import { getReferenceBySlug } from '@/lib/library';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const reference = await getReferenceBySlug(slug);
  if (!reference) {
    return NextResponse.json(
      { ok: false, error: 'NOT_FOUND', message: `No reference with slug "${slug}"` },
      { status: 404 },
    );
  }
  if (request.nextUrl.searchParams.get('format') === 'dossier') {
    const row = await prisma.reference.findUnique({ where: { slug }, select: { sourceDossierJson: true, updatedAt: true } });
    if (!row?.sourceDossierJson) return NextResponse.json({ ok: false, error: 'SOURCE_DOSSIER_UNAVAILABLE', message: 'Le dossier d’origine n’est pas conservé pour cette ancienne référence.' }, { status: 409 });
    const original = ResearchDossierSchema.parse(JSON.parse(row.sourceDossierJson));
    const { contact: _privateContact, ...researcher } = original.researcher;
    return NextResponse.json({ ...original, researcher }, { headers: {
      'Content-Disposition': `attachment; filename="argos-${reference.slug}.json"`,
      'Cache-Control': 'no-store', ETag: JSON.stringify(row.updatedAt.toISOString()),
    } });
  }
  return NextResponse.json({ data: reference });
}
