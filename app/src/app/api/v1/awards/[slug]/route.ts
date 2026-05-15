import { NextResponse, type NextRequest } from 'next/server';
import { getReferencesByAward, slugify } from '@/lib/library';
import { VICTORY_LABELS } from '@/lib/taxonomy';
import type { VictoryType } from '@/lib/types';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const award = (Object.keys(VICTORY_LABELS) as VictoryType[]).find(
    (v) => slugify(v) === slug,
  );
  if (!award) {
    return NextResponse.json({ ok: false, error: 'NOT_FOUND' }, { status: 404 });
  }
  const refs = await getReferencesByAward(award);
  return NextResponse.json({
    data: {
      key: award,
      label: VICTORY_LABELS[award],
      slug,
      operationsCount: refs.length,
      references: refs,
    },
  });
}
