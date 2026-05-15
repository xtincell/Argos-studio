// GET /api/v1/brands — facets list with counts.

import { NextResponse } from 'next/server';
import { listBrands } from '@/lib/library';

export async function GET() {
  const brands = await listBrands();
  return NextResponse.json({
    data: brands.map((b) => ({
      slug: b.slug,
      name: b.label,
      operationsCount: b.count,
      href: `/brand/${b.slug}`,
      apiHref: `/api/v1/brands/${b.slug}`,
    })),
    meta: { total: brands.length },
  });
}
