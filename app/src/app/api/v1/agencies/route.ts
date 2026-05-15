import { NextResponse } from 'next/server';
import { listAgencies } from '@/lib/library';

export async function GET() {
  const agencies = await listAgencies();
  return NextResponse.json({
    data: agencies.map((a) => ({
      slug: a.slug,
      name: a.label,
      operationsCount: a.count,
      href: `/agency/${a.slug}`,
      apiHref: `/api/v1/agencies/${a.slug}`,
    })),
    meta: { total: agencies.length },
  });
}
