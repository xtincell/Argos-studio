import { NextResponse } from 'next/server';
import { listAssetFunctions } from '@/lib/library';
import { ASSET_FUNCTION_LABELS } from '@/lib/taxonomy';

export async function GET() {
  const fns = await listAssetFunctions();
  return NextResponse.json({
    data: fns.map((f) => ({
      key: f.value,
      label: ASSET_FUNCTION_LABELS[f.value],
      slug: f.slug,
      assetsCount: f.count,
      href: `/assets?function=${f.slug}`,
      apiHref: `/api/v1/assets?function=${f.slug}`,
    })),
    meta: { total: fns.length },
  });
}
