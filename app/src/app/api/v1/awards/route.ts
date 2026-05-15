import { NextResponse } from 'next/server';
import { listAwards } from '@/lib/library';
import { VICTORY_LABELS } from '@/lib/taxonomy';

export async function GET() {
  const awards = await listAwards();
  return NextResponse.json({
    data: awards.map((a) => ({
      key: a.value,
      label: VICTORY_LABELS[a.value],
      slug: a.slug,
      operationsCount: a.count,
      href: `/award/${a.slug}`,
      apiHref: `/api/v1/awards/${a.slug}`,
    })),
    meta: { total: awards.length },
  });
}
