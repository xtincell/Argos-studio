import { NextResponse, type NextRequest } from 'next/server';
import { getReferencesByMarket, slugify } from '@/lib/library';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const refs = await getReferencesByMarket(slug);
  if (refs.length === 0) {
    return NextResponse.json({ ok: false, error: 'NOT_FOUND' }, { status: 404 });
  }
  // Find the canonical spelling
  const first = refs[0];
  if (!first) {
    return NextResponse.json({ ok: false, error: 'NOT_FOUND' }, { status: 404 });
  }
  const name =
    slugify(first.marketPrimary) === slug
      ? first.marketPrimary
      : first.marketsSecondary.find((m) => slugify(m) === slug) ?? slug;
  return NextResponse.json({
    data: {
      slug,
      name,
      sectors: Array.from(new Set(refs.map((r) => r.sector))),
      brands: Array.from(new Set(refs.map((r) => r.brandEmitter))),
      operationsCount: refs.length,
      references: refs,
    },
  });
}
