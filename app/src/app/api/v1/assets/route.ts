import { NextResponse, type NextRequest } from 'next/server';
import { getAllAssets, getAssetsByFunction, slugify } from '@/lib/library';
import { ASSET_FUNCTION_LABELS } from '@/lib/taxonomy';
import type { AssetFunction } from '@/lib/types';

export async function GET(request: NextRequest) {
  const fnParam = request.nextUrl.searchParams.get('function');
  const limit = Math.min(
    200,
    Math.max(1, Number.parseInt(request.nextUrl.searchParams.get('limit') ?? '50', 10) || 50),
  );
  const offset = Math.max(
    0,
    Number.parseInt(request.nextUrl.searchParams.get('offset') ?? '0', 10) || 0,
  );

  let fn: AssetFunction | undefined;
  if (fnParam) {
    fn = (Object.keys(ASSET_FUNCTION_LABELS) as AssetFunction[]).find(
      (f) => slugify(f) === fnParam || f === fnParam,
    );
    if (!fn) {
      return NextResponse.json(
        { ok: false, error: 'UNKNOWN_FUNCTION', message: `Unknown asset function "${fnParam}"` },
        { status: 400 },
      );
    }
  }

  const items = fn ? await getAssetsByFunction(fn) : await getAllAssets();
  const total = items.length;
  const page = items.slice(offset, offset + limit);

  return NextResponse.json({
    data: page,
    meta: {
      pagination: { offset, limit, total, totalPages: Math.ceil(total / limit) },
      filters: { function: fn },
    },
  });
}
