import { NextResponse, type NextRequest } from 'next/server';
import { getReferencesByYear } from '@/lib/library';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ year: string }> },
) {
  const { year } = await params;
  const yearNum = Number.parseInt(year, 10);
  if (!Number.isFinite(yearNum)) {
    return NextResponse.json({ ok: false, error: 'INVALID_YEAR' }, { status: 400 });
  }
  const refs = await getReferencesByYear(yearNum);
  if (refs.length === 0) {
    return NextResponse.json({ ok: false, error: 'NOT_FOUND' }, { status: 404 });
  }
  return NextResponse.json({
    data: {
      year: yearNum,
      operationsCount: refs.length,
      references: refs,
    },
  });
}
