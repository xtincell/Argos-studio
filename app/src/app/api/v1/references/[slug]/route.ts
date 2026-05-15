// GET /api/v1/references/{slug} — returns a single Reference with full payload.

import { NextResponse, type NextRequest } from 'next/server';
import { getReferenceBySlug } from '@/lib/library';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const reference = await getReferenceBySlug(slug);
  if (!reference) {
    return NextResponse.json(
      { ok: false, error: 'NOT_FOUND', message: `No reference with slug "${slug}"` },
      { status: 404 },
    );
  }
  return NextResponse.json({ data: reference });
}
