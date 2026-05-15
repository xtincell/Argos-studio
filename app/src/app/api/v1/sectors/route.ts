import { NextResponse } from 'next/server';
import { listSectors } from '@/lib/library';

export async function GET() {
  const sectors = await listSectors();
  return NextResponse.json({
    data: sectors.map((s) => ({
      slug: s.slug,
      name: s.label,
      operationsCount: s.count,
      href: `/sector/${s.slug}`,
      apiHref: `/api/v1/sectors/${s.slug}`,
    })),
    meta: { total: sectors.length },
  });
}
