import { NextResponse, type NextRequest } from 'next/server';
import { getReferencesByAgency } from '@/lib/library';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const refs = await getReferencesByAgency(slug);
  if (refs.length === 0) {
    return NextResponse.json({ ok: false, error: 'NOT_FOUND' }, { status: 404 });
  }
  return NextResponse.json({
    data: {
      slug,
      name: refs[0]?.agencyCreator,
      brands: Array.from(new Set(refs.map((r) => r.brandEmitter))),
      operationsCount: refs.length,
      references: refs,
    },
  });
}
