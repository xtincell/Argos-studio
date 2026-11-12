import type { NextRequest } from 'next/server';
import { getReferencesBySector, getSectorMeta } from '@/lib/library';
import { requestReadScope, scopedJson } from '@/server/read-scope';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const scope = requestReadScope(request);
  const { slug } = await params;
  const refs = await getReferencesBySector(slug, scope);
  if (refs.length === 0) {
    return scopedJson({ ok: false, error: 'NOT_FOUND' }, scope, { status: 404 });
  }
  const meta = getSectorMeta(slug);
  return scopedJson({
    data: {
      slug,
      name: meta?.name ?? refs[0]?.sector,
      description: meta?.description,
      topBrands: meta?.topBrands ?? [],
      emergingPatterns: meta?.emergingPatterns ?? [],
      operationsCount: refs.length,
      references: refs,
    },
  }, scope);
}
