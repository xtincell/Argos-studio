import type { NextRequest } from 'next/server';
import { getReferencesByYear } from '@/lib/library';
import { requestReadScope, scopedJson } from '@/server/read-scope';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ year: string }> },
) {
  const scope = requestReadScope(request);
  const { year } = await params;
  const yearNum = Number.parseInt(year, 10);
  if (!Number.isFinite(yearNum)) {
    return scopedJson({ ok: false, error: 'INVALID_YEAR' }, scope, { status: 400 });
  }
  const refs = await getReferencesByYear(yearNum, scope);
  if (refs.length === 0) {
    return scopedJson({ ok: false, error: 'NOT_FOUND' }, scope, { status: 404 });
  }
  return scopedJson({
    data: {
      year: yearNum,
      operationsCount: refs.length,
      references: refs,
    },
  }, scope);
}
