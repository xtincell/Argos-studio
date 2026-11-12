import type { NextRequest } from 'next/server';
import { listMarkets } from '@/lib/library';
import { requestReadScope, scopedJson } from '@/server/read-scope';

export async function GET(request: NextRequest) {
  const scope = requestReadScope(request);
  const markets = await listMarkets(scope);
  return scopedJson({
    data: markets.map((m) => ({
      slug: m.slug,
      name: m.label,
      operationsCount: m.count,
      href: `/market/${m.slug}`,
      apiHref: `/api/v1/markets/${m.slug}`,
    })),
    meta: { total: markets.length },
  }, scope);
}
