// GET /api/v1/brands — facets list with counts.

import type { NextRequest } from 'next/server';
import { listBrands } from '@/lib/library';
import { requestReadScope, scopedJson } from '@/server/read-scope';

export async function GET(request: NextRequest) {
  const scope = requestReadScope(request);
  const brands = await listBrands(scope);
  return scopedJson({
    data: brands.map((b) => ({
      slug: b.slug,
      name: b.label,
      operationsCount: b.count,
      href: `/brand/${b.slug}`,
      apiHref: `/api/v1/brands/${b.slug}`,
    })),
    meta: { total: brands.length },
  }, scope);
}
