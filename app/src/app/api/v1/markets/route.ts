import { NextResponse } from 'next/server';
import { listMarkets } from '@/lib/library';

export async function GET() {
  const markets = await listMarkets();
  return NextResponse.json({
    data: markets.map((m) => ({
      slug: m.slug,
      name: m.label,
      operationsCount: m.count,
      href: `/market/${m.slug}`,
      apiHref: `/api/v1/markets/${m.slug}`,
    })),
    meta: { total: markets.length },
  });
}
