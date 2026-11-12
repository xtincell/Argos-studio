import type { NextRequest } from 'next/server';
import { listAwards } from '@/lib/library';
import { VICTORY_LABELS } from '@/lib/taxonomy';
import { requestReadScope, scopedJson } from '@/server/read-scope';

export async function GET(request: NextRequest) {
  const scope = requestReadScope(request);
  const awards = await listAwards(scope);
  return scopedJson({
    data: awards.map((a) => ({
      key: a.value,
      label: VICTORY_LABELS[a.value],
      slug: a.slug,
      operationsCount: a.count,
      href: `/award/${a.slug}`,
      apiHref: `/api/v1/awards/${a.slug}`,
    })),
    meta: { total: awards.length },
  }, scope);
}
