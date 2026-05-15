import { NextResponse } from 'next/server';
import { listYears } from '@/lib/library';

export async function GET() {
  const years = await listYears();
  return NextResponse.json({
    data: years.map((y) => ({
      year: y.value,
      operationsCount: y.count,
      href: `/year/${y.value}`,
      apiHref: `/api/v1/years/${y.value}`,
    })),
    meta: { total: years.length },
  });
}
