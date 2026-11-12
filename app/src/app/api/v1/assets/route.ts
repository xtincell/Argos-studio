import type { NextRequest } from 'next/server';
import { getAllAssets, getAssetsByFunction, slugify } from '@/lib/library';
import { requestReadScope, scopedJson } from '@/server/read-scope';
import { ASSET_FUNCTION_LABELS } from '@/lib/taxonomy';
import type { AssetFunction } from '@/lib/types';

export async function GET(request: NextRequest) {
  const scope = requestReadScope(request);
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
      return scopedJson(
        { ok: false, error: 'UNKNOWN_FUNCTION', message: `Unknown asset function "${fnParam}"` },
        scope,
        { status: 400 },
      );
    }
  }

  const items = fn ? await getAssetsByFunction(fn, scope) : await getAllAssets(scope);
  const total = items.length;
  const page = items.slice(offset, offset + limit);

  return scopedJson({
    data: page,
    meta: {
      pagination: { offset, limit, total, totalPages: Math.ceil(total / limit) },
      filters: { function: fn },
    },
  }, scope);
}
