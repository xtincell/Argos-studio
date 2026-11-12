// GET /api/v1/brands/{slug} — references emitted by this brand.

import type { NextRequest } from 'next/server';
import { getReferencesByBrand } from '@/lib/library';
import { requestReadScope, scopedJson } from '@/server/read-scope';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const scope = requestReadScope(request);
  const { slug } = await params;
  const refs = await getReferencesByBrand(slug, scope);
  const first = refs[0];
  if (!first) {
    return scopedJson(
      { ok: false, error: 'NOT_FOUND', message: `No brand with slug "${slug}"` },
      scope,
      { status: 404 },
    );
  }
  return scopedJson({
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
  }, scope);
}
