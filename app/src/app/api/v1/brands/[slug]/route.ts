// GET /api/v1/brands/{slug} — references emitted by this brand.

import { NextResponse, type NextRequest } from 'next/server';
import { getReferencesByBrand } from '@/lib/library';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const refs = await getReferencesByBrand(slug);
  if (refs.length === 0) {
    return NextResponse.json(
      { ok: false, error: 'NOT_FOUND', message: `No brand with slug "${slug}"` },
      { status: 404 },
    );
  }
  const first = refs[0];
  if (!first) {
    return NextResponse.json(
      { ok: false, error: 'NOT_FOUND', message: `No brand with slug "${slug}"` },
      { status: 404 },
    );
  }
  return NextResponse.json({
    data: {
      slug,
      name: first.brandEmitter,
      sectors: Array.from(new Set(refs.map((r) => r.sector))),
      agencies: Array.from(
        new Set(refs.map((r) => r.agencyCreator).filter((a): a is string => Boolean(a))),
      ),
      markets: Array.from(new Set(refs.flatMap((r) => [r.marketPrimary, ...r.marketsSecondary]))),
      operationsCount: refs.length,
      references: refs,
    },
  });
}
