import type { NextRequest } from 'next/server';
import { getReferencesByAgency } from '@/lib/library';
import { requestReadScope, scopedJson } from '@/server/read-scope';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const scope = requestReadScope(request);
  const { slug } = await params;
  const refs = await getReferencesByAgency(slug, scope);
  if (refs.length === 0) {
    return scopedJson({ ok: false, error: 'NOT_FOUND' }, scope, { status: 404 });
  }
  return scopedJson({
    data: {
      slug,
      name: refs[0]?.agencyCreator,
      brands: Array.from(new Set(refs.map((r) => r.brandEmitter))),
      operationsCount: refs.length,
      references: refs,
    },
  }, scope);
}
