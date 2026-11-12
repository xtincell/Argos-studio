import type { NextRequest } from 'next/server';
import { getReferencesByMarket, slugify } from '@/lib/library';
import { requestReadScope, scopedJson } from '@/server/read-scope';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const scope = requestReadScope(request);
  const { slug } = await params;
  const refs = await getReferencesByMarket(slug, scope);
  // Find the canonical spelling
  const first = refs[0];
  if (!first) {
    return scopedJson({ ok: false, error: 'NOT_FOUND' }, scope, { status: 404 });
  }
  const name =
    slugify(first.marketPrimary) === slug
      ? first.marketPrimary
      : first.marketsSecondary.find((m) => slugify(m) === slug) ?? slug;
  return scopedJson({
    data: {
      slug,
      name,
      sectors: Array.from(new Set(refs.map((r) => r.sector))),
      brands: Array.from(new Set(refs.map((r) => r.brandEmitter))),
      operationsCount: refs.length,
      references: refs,
    },
  }, scope);
}
