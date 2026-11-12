import type { NextRequest } from 'next/server';
import { listAgencies } from '@/lib/library';
import { requestReadScope, scopedJson } from '@/server/read-scope';

export async function GET(request: NextRequest) {
  const scope = requestReadScope(request);
  const agencies = await listAgencies(scope);
  return scopedJson({
    data: agencies.map((a) => ({
      slug: a.slug,
      name: a.label,
      operationsCount: a.count,
      href: `/agency/${a.slug}`,
      apiHref: `/api/v1/agencies/${a.slug}`,
    })),
    meta: { total: agencies.length },
  }, scope);
}
