import type { NextRequest } from 'next/server';
import { getReferencesByAward, slugify } from '@/lib/library';
import { VICTORY_LABELS } from '@/lib/taxonomy';
import type { VictoryType } from '@/lib/types';
import { requestReadScope, scopedJson } from '@/server/read-scope';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const scope = requestReadScope(request);
  const { slug } = await params;
  const award = (Object.keys(VICTORY_LABELS) as VictoryType[]).find(
    (v) => slugify(v) === slug,
  );
  if (!award) {
    return scopedJson({ ok: false, error: 'NOT_FOUND' }, scope, { status: 404 });
  }
  const refs = await getReferencesByAward(award, scope);
  return scopedJson({
    data: {
      key: award,
      label: VICTORY_LABELS[award],
      slug,
      operationsCount: refs.length,
      references: refs,
    },
  }, scope);
}
