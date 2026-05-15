import { NextResponse, type NextRequest } from 'next/server';
import { getReferencesBySector, getSectorMeta } from '@/lib/library';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const refs = await getReferencesBySector(slug);
  if (refs.length === 0) {
    return NextResponse.json(
      { ok: false, error: 'NOT_FOUND' },
      { status: 404 },
    );
  }
  const meta = getSectorMeta(slug);
  return NextResponse.json({
    data: {
      slug,
      name: meta?.name ?? refs[0]?.sector,
      description: meta?.description,
      topBrands: meta?.topBrands ?? [],
      emergingPatterns: meta?.emergingPatterns ?? [],
      operationsCount: refs.length,
      references: refs,
    },
  });
}
