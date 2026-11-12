import type { NextRequest } from 'next/server';
import { listAssetFunctions } from '@/lib/library';
import { ASSET_FUNCTION_LABELS } from '@/lib/taxonomy';
import { requestReadScope, scopedJson } from '@/server/read-scope';

export async function GET(request: NextRequest) {
  const scope = requestReadScope(request);
  const fns = await listAssetFunctions(scope);
  return scopedJson({
    data: fns.map((f) => ({
      key: f.value,
      label: ASSET_FUNCTION_LABELS[f.value],
      slug: f.slug,
      assetsCount: f.count,
      href: `/assets?function=${f.slug}`,
      apiHref: `/api/v1/assets?function=${f.slug}`,
    })),
    meta: { total: fns.length },
  }, scope);
}
