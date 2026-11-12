import type { NextRequest } from 'next/server';
import { listSectors } from '@/lib/library';
import { requestReadScope, scopedJson } from '@/server/read-scope';

export async function GET(request: NextRequest) {
  const scope = requestReadScope(request);
  const sectors = await listSectors(scope);
  return scopedJson({
    data: sectors.map((s) => ({
      slug: s.slug,
      name: s.label,
      operationsCount: s.count,
      href: `/sector/${s.slug}`,
      apiHref: `/api/v1/sectors/${s.slug}`,
    })),
    meta: { total: sectors.length },
  }, scope);
}
