// GET /api/v1/references
// Query params : ?brand=&agency=&sector=&market=&year=&victory=&patternKind=&manipulationMode=&pillar=&q=&limit=&offset=
//
// Returns a paginated list of references with full payload.

import { NextResponse, type NextRequest } from 'next/server';
import { getAllReferences, slugify } from '@/lib/library';

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const brand = sp.get('brand')?.toLowerCase();
  const agency = sp.get('agency')?.toLowerCase();
  const sector = sp.get('sector')?.toLowerCase();
  const market = sp.get('market')?.toLowerCase();
  const year = sp.get('year') ? Number.parseInt(sp.get('year') ?? '', 10) : undefined;
  const victory = sp.get('victory');
  const patternKind = sp.get('patternKind');
  const manipulationMode = sp.get('manipulationMode');
  const pillar = sp.get('pillar')?.toUpperCase();
  const q = sp.get('q')?.toLowerCase();
  const limit = Math.min(100, Math.max(1, Number.parseInt(sp.get('limit') ?? '24', 10) || 24));
  const offset = Math.max(0, Number.parseInt(sp.get('offset') ?? '0', 10) || 0);

  const all = await getAllReferences();
  const filtered = all.filter((r) => {
    if (brand && slugify(r.brandEmitter) !== brand) return false;
    if (agency && (!r.agencyCreator || slugify(r.agencyCreator) !== agency)) return false;
    if (sector && slugify(r.sector) !== sector) return false;
    if (market) {
      const inPrimary = slugify(r.marketPrimary) === market;
      const inSecondary = r.marketsSecondary.some((m) => slugify(m) === market);
      if (!inPrimary && !inSecondary) return false;
    }
    if (year !== undefined && r.emissionYear !== year) return false;
    if (victory && !r.victoryTypes.includes(victory as never)) return false;
    if (patternKind && r.patternKind !== patternKind) return false;
    if (manipulationMode && r.manipulationMode !== manipulationMode) return false;
    if (pillar && !r.pillars.includes(pillar as never)) return false;
    if (q) {
      const hay = [
        r.title,
        r.brandEmitter,
        r.agencyCreator ?? '',
        r.sector,
        r.marketPrimary,
        ...r.marketsSecondary,
        r.summary,
        ...r.assets.flatMap((a) => [a.text ?? '', a.caption ?? '', a.format ?? '']),
      ]
        .join(' ')
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const total = filtered.length;
  const page = filtered.slice(offset, offset + limit);

  return NextResponse.json({
    data: page,
    meta: {
      pagination: {
        page: Math.floor(offset / limit) + 1,
        perPage: limit,
        offset,
        total,
        totalPages: Math.ceil(total / limit),
      },
      filters: {
        brand,
        agency,
        sector,
        market,
        year,
        victory,
        patternKind,
        manipulationMode,
        pillar,
        q,
      },
    },
  });
}
