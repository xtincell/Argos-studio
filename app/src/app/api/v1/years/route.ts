import type { NextRequest } from 'next/server';
import { listYears } from '@/lib/library';
import { requestReadScope, scopedJson } from '@/server/read-scope';

export async function GET(request: NextRequest) {
  const scope = requestReadScope(request);
  const years = await listYears(scope);
  return scopedJson({
    data: years.map((y) => ({
      year: y.value,
      operationsCount: y.count,
      href: `/year/${y.value}`,
      apiHref: `/api/v1/years/${y.value}`,
    })),
    meta: { total: years.length },
  }, scope);
}
