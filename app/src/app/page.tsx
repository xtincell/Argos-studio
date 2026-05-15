import Image from 'next/image';
import Link from 'next/link';
import { countResearchSources, getAllAssets, getAllReferences, listBrands, listSectors } from '@/lib/library';
import { ASSET_FUNCTION_LABELS } from '@/lib/taxonomy';
import { getHeroAsset, type Asset, type AssetFunction, type Reference } from '@/lib/types';

interface DiscoverPageProps {
  searchParams?: Promise<{ f?: string | string[] }>;
}

/** Predicates for the chip-based home filter. Kept in sync with FilterRow. */
const HOME_FILTERS: Record<string, (r: Reference) => boolean> = {
  'competitor-imitated': (r) => r.victoryTypes.includes('COMPETITOR_IMITATED'),
  facilitator: (r) => r.manipulationMode === 'FACILITATOR',
  'world-building': (r) => r.operationGoals.includes('BRAND_WORLD_BUILDING'),
  auctoriality: (r) =>
    r.axes.some((ax) => ax.name === 'AUCTORIALITY' && ax.confidence > 0.8),
};

export default async function DiscoverPage({ searchParams }: DiscoverPageProps) {
  const sp = (await searchParams) ?? {};
  const activeFilter = Array.isArray(sp.f) ? sp.f[0] : sp.f;
  const filterPredicate =
    activeFilter && HOME_FILTERS[activeFilter] ? HOME_FILTERS[activeFilter] : null;

  const all = await getAllReferences();
  const brands = await listBrands();
  const sectors = await listSectors();
  const totalSources = await countResearchSources();

  // Featured = highest composite score
  const featured =
    [...all].sort((a, b) => b.performance.composite - a.performance.composite)[0] ?? all[0];
  // Show all other references as secondary cards — diversity by brand first,
  // then by composite score within each brand. Keeps Patagonia/Apple/Nike
  // visible even when their composite scores trail mocked references.
  const secondaries = (() => {
    let others = all.filter((r) => r.slug !== featured?.slug);
    if (filterPredicate) {
      others = others.filter(filterPredicate);
    }
    const byBrand = new Map<string, Reference[]>();
    for (const r of others.sort((a, b) => b.performance.composite - a.performance.composite)) {
      const list = byBrand.get(r.brandEmitter) ?? [];
      list.push(r);
      byBrand.set(r.brandEmitter, list);
    }
    // Round-robin one card per brand at a time, so the bento alternates brands.
    const out: Reference[] = [];
    let added = true;
    while (added) {
      added = false;
      for (const list of byBrand.values()) {
        const next = list.shift();
        if (next) {
          out.push(next);
          added = true;
        }
      }
    }
    return out;
  })();

  const totalRefs = all.length;
  const totalAssets = all.reduce((sum, r) => sum + r.assets.length, 0);
  const totalBrands = brands.length;
  const totalSectors = sectors.length;
  const yearsCovered = (() => {
    const years = all.map((r) => r.emissionYear).filter((y) => y > 0);
    if (years.length === 0) return 0;
    return Math.max(...years) - Math.min(...years) + 1;
  })();

  const salesMetrics = all
    .flatMap((r) => r.performance.metrics.map((m) => ({ ref: r, metric: m })))
    .filter((x) => x.metric.kind === 'SALES_LIFT_PCT');
  const topSales = salesMetrics.sort((a, b) => b.metric.value - a.metric.value)[0];

  const cultMetrics = all
    .flatMap((r) => r.performance.metrics)
    .filter((m) => m.kind === 'CULT_INDEX_0_100');
  const cultIndexAvg =
    cultMetrics.length > 0
      ? Math.round(cultMetrics.reduce((s, m) => s + m.value, 0) / cultMetrics.length)
      : Math.round(all.reduce((s, r) => s + r.performance.composite, 0) / Math.max(1, all.length));

  const distinctPatterns = new Set(all.map((r) => r.patternKind)).size;

  // Real distribution: count references by decade across the span actually
  // covered. Used for the sparkline in the "Références indexées" tile.
  const decadeDistribution = (() => {
    const years = all.map((r) => r.emissionYear).filter((y) => y > 0);
    if (years.length === 0) return [];
    const min = Math.floor(Math.min(...years) / 10) * 10;
    const max = Math.floor(Math.max(...years) / 10) * 10;
    const buckets: { label: number; count: number }[] = [];
    for (let d = min; d <= max; d += 10) {
      buckets.push({ label: d, count: years.filter((y) => Math.floor(y / 10) * 10 === d).length });
    }
    const peak = Math.max(...buckets.map((b) => b.count), 1);
    return buckets.map((b) => ({ ...b, height: Math.max(8, (b.count / peak) * 100) }));
  })();

  const chipCounts = {
    competitorImitated: all.filter((r) => r.victoryTypes.includes('COMPETITOR_IMITATED')).length,
    facilitator: all.filter((r) => r.manipulationMode === 'FACILITATOR').length,
    worldBuilding: all.filter((r) => r.operationGoals.includes('BRAND_WORLD_BUILDING')).length,
    strongAuctoriality: all.filter((r) =>
      r.axes.some((ax) => ax.name === 'AUCTORIALITY' && ax.confidence > 0.8),
    ).length,
  };

  // Featured assets — show 6 hero/primary assets across brands, asset-first
  const allAssetsList = await getAllAssets();
  const featuredAssets = (() => {
    const picks: typeof allAssetsList = [];
    const seenBrands = new Set<string>();
    // Priority 1 : iconic taglines & manifestos (TEXT, HERO role)
    for (const item of allAssetsList) {
      if (item.asset.kind === 'TEXT' && item.asset.role === 'HERO' && !seenBrands.has(item.reference.brandEmitter)) {
        picks.push(item);
        seenBrands.add(item.reference.brandEmitter);
      }
      if (picks.length >= 4) break;
    }
    // Priority 2 : HERO/PRIMARY image assets
    for (const item of allAssetsList) {
      if (picks.length >= 6) break;
      if (
        item.asset.kind === 'IMAGE' &&
        (item.asset.role === 'HERO' || item.asset.role === 'PRIMARY') &&
        item.asset.url &&
        !picks.find((p) => p.asset.id === item.asset.id)
      ) {
        picks.push(item);
      }
    }
    return picks.slice(0, 6);
  })();

  return (
    <section className="view" data-view="discover">
      <div className="wrap">
        <Hero featured={featured} totalRefs={totalRefs} totalAssets={totalAssets} yearsCovered={yearsCovered} />
        <FeaturedAssets items={featuredAssets} />
        <FilterRow
          total={totalRefs}
          chipCounts={chipCounts}
          activeFilter={activeFilter && HOME_FILTERS[activeFilter] ? activeFilter : null}
        />
        <Bento
          featured={featured}
          secondaries={secondaries}
          totalRefs={totalRefs}
          totalAssets={totalAssets}
          totalBrands={totalBrands}
          totalSectors={totalSectors}
          totalSources={totalSources}
          topSales={topSales}
          cultIndexAvg={cultIndexAvg}
          distinctPatterns={distinctPatterns}
          decadeDistribution={decadeDistribution}
        />
      </div>
    </section>
  );
}

function Hero({
  featured,
  totalRefs,
  totalAssets,
  yearsCovered,
}: {
  featured?: Reference;
  totalRefs: number;
  totalAssets: number;
  yearsCovered: number;
}) {
  const hero = featured ? getHeroAsset(featured) : undefined;
  const heroImage = featured ? pickImageAsset(featured) : undefined;
  const phClass = phaseClassFor(featured?.brandEmitter ?? '');
  return (
    <div className="disc-hero">
      <div className="l">
        <div className="pills">
          <span className="pill"><span className="sp">✦</span> Répertoire éditorial</span>
          {yearsCovered > 0 && (
            <span className="pill"><span className="sp">✦</span> {yearsCovered} ans couverts</span>
          )}
          <span className="pill dark">Dossiers vérifiés à la main</span>
        </div>
        <h1>
          Les opérations marketing qui ont <span className="serif">fait école.</span>
        </h1>
        <p className="deck">
          <b>{totalRefs} dossiers</b>, <b>{totalAssets} assets</b>. Sources vérifiables, métriques sourcées. À lire, à fouiller, à copier.
        </p>
        <form action="/assets" method="get" className="search">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
            <title>Recherche</title>
            <circle cx="7" cy="7" r="4.5" />
            <path d="m10.5 10.5 3 3" />
          </svg>
          <input
            name="q"
            placeholder="Cherchez un asset : tagline, manifeste, key visual, OOH…"
            aria-label="Recherche d'assets"
          />
          <button className="go" type="submit">
            Chercher <span style={{ fontSize: 11, opacity: 0.7 }}>⏎</span>
          </button>
        </form>
        <div className="sugs">
          <span className="sl">Essayez :</span>
          <Link href="/assets?function=tagline" className="pill" style={{ cursor: 'pointer' }}>
            Taglines
          </Link>
          <Link href="/assets?function=manifesto" className="pill" style={{ cursor: 'pointer' }}>
            Manifestes
          </Link>
          <Link href="/assets?function=ooh-billboard" className="pill" style={{ cursor: 'pointer' }}>
            OOH
          </Link>
          <Link href="/assets?role=HERO" className="pill" style={{ cursor: 'pointer' }}>
            Hero assets
          </Link>
          <Link href="/search" className="pill dark" style={{ cursor: 'pointer' }}>
            Chercher une opération entière →
          </Link>
        </div>
      </div>
      <div className={`r ${phClass}`}>
        {heroImage?.url && (
          <Image
            src={heroImage.url}
            alt={heroImage.alt ?? heroImage.caption ?? featured?.title ?? 'Hero'}
            fill
            priority
            sizes="(max-width: 768px) 100vw, 50vw"
            style={{ objectFit: 'cover', zIndex: 0 }}
          />
        )}
        <div className="badge" style={{ position: 'relative', zIndex: 1 }}>
          <span className="pill coral">
            <span className="sp" style={{ color: '#fff' }}>✦</span> À la une
          </span>
          <span className="pill">
            {featured?.brandEmitter ?? '—'} · {featured?.emissionYear ?? '—'}
          </span>
        </div>
        {featured && (
          <>
            <div className="float f3" style={{ zIndex: 1 }}>
              <span className="d" aria-hidden /> Score d'imitabilité · {featured.performance.composite}/100
            </div>
            <div className="float f2" style={{ zIndex: 1, maxWidth: 280 }}>
              <div className="t">
                <b>{featured.title}</b>
                {hero?.caption ? ` — ${shorten(hero.caption, 90)}` : ''}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function FeaturedAssets({
  items,
}: {
  items: Array<{ asset: Asset; reference: Pick<Reference, 'slug' | 'title' | 'brandEmitter' | 'sector' | 'emissionYear'> }>;
}) {
  if (items.length === 0) return null;
  return (
    <section style={{ marginTop: 36, marginBottom: 28 }}>
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 14,
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <p
            className="mono"
            style={{
              fontSize: 11,
              color: 'var(--ink-3)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              margin: 0,
              marginBottom: 6,
            }}
          >
            La bibliothèque · assets en vedette
          </p>
          <h2 style={{ margin: 0, fontSize: 28, letterSpacing: '-0.015em', fontWeight: 600 }}>
            Taglines, manifestes, key visuals — <span className="serif">l'unité de base.</span>
          </h2>
        </div>
        <Link
          href="/assets"
          style={{
            fontSize: 13,
            color: 'var(--coral)',
            textDecoration: 'underline',
            whiteSpace: 'nowrap',
          }}
        >
          Tous les assets →
        </Link>
      </header>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 12,
        }}
      >
        {items.map((item) => (
          <FeaturedAssetCard key={item.asset.id} asset={item.asset} reference={item.reference} />
        ))}
      </div>
    </section>
  );
}

function FeaturedAssetCard({
  asset,
  reference,
}: {
  asset: Asset;
  reference: Pick<Reference, 'slug' | 'title' | 'brandEmitter' | 'sector' | 'emissionYear'>;
}) {
  const fnLabel = ASSET_FUNCTION_LABELS[asset.function as AssetFunction] ?? asset.function;
  const hasImg = !!asset.url && (asset.kind === 'IMAGE' || !!asset.posterUrl);
  const imgSrc = asset.posterUrl ?? asset.url;
  return (
    <Link
      href={`/asset/${asset.id}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--paper)',
        border: '1px solid var(--line-soft)',
        borderRadius: 14,
        overflow: 'hidden',
        textDecoration: 'none',
        color: 'inherit',
        minHeight: 200,
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '4 / 3',
          background: 'var(--bg-2)',
          overflow: 'hidden',
        }}
      >
        {hasImg && imgSrc ? (
          <Image
            src={imgSrc}
            alt={asset.alt ?? asset.caption ?? fnLabel}
            fill
            sizes="(max-width: 768px) 100vw, 25vw"
            style={{ objectFit: 'cover' }}
          />
        ) : asset.text ? (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              padding: 18,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--font-serif), serif',
              fontStyle: 'italic',
              fontSize: asset.text.length > 80 ? 13 : 18,
              lineHeight: 1.3,
              color: 'var(--ink)',
              textAlign: 'center',
              textWrap: 'balance',
            }}
          >
            « {asset.text.length > 140 ? asset.text.slice(0, 138) + '…' : asset.text} »
          </div>
        ) : (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--ink-3)',
              fontSize: 13,
            }}
          >
            {fnLabel}
          </div>
        )}
      </div>
      <div style={{ padding: 12 }}>
        <div
          className="mono"
          style={{
            fontSize: 10,
            color: 'var(--coral)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            marginBottom: 4,
          }}
        >
          {fnLabel}
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.25 }}>
          {reference.title}
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 4 }}>
          {reference.brandEmitter} · {reference.emissionYear}
        </div>
      </div>
    </Link>
  );
}

function FilterRow({
  total,
  chipCounts,
  activeFilter,
}: {
  total: number;
  chipCounts: { competitorImitated: number; facilitator: number; worldBuilding: number; strongAuctoriality: number };
  activeFilter: string | null;
}) {
  // Chip key must match HOME_FILTERS predicate keys above.
  // Each chip filters the home bento on click; `Tout` clears the filter.
  const chips: Array<{ key: string; label: string; count: number }> = [
    { key: 'competitor-imitated', label: 'A été copié', count: chipCounts.competitorImitated },
    { key: 'facilitator', label: 'Posture Facilitateur', count: chipCounts.facilitator },
    { key: 'world-building', label: 'Construit la marque-univers', count: chipCounts.worldBuilding },
    { key: 'auctoriality', label: 'Auctorialité forte', count: chipCounts.strongAuctoriality },
  ].filter((c) => c.count > 0);

  return (
    <div className="filt-row">
      <div className="grp">
        <span className="ttl">Filtrer</span>
        <Link
          href="/"
          className={`chip${activeFilter ? '' : ' on'}`}
          scroll={false}
          aria-current={activeFilter ? undefined : 'page'}
        >
          Tout <span className="ct">{total}</span>
        </Link>
        {chips.map((c) => {
          const isActive = c.key === activeFilter;
          return (
            <Link
              key={c.key}
              href={isActive ? '/' : `/?f=${c.key}`}
              className={`chip${isActive ? ' on' : ''}`}
              scroll={false}
              aria-current={isActive ? 'true' : undefined}
              aria-label={
                isActive ? `Désactiver le filtre ${c.label}` : `Filtrer par ${c.label}`
              }
            >
              {c.label} <span className="ct">{c.count}</span>
            </Link>
          );
        })}
      </div>
      <div className="sortby">
        Trié par <b>Score d&apos;imitabilité ↓</b>
      </div>
    </div>
  );
}

function Bento({
  secondaries,
  totalRefs,
  totalAssets,
  totalBrands,
  totalSectors,
  totalSources,
  topSales,
  cultIndexAvg,
  distinctPatterns,
  decadeDistribution,
}: {
  featured?: Reference;
  secondaries: Reference[];
  totalRefs: number;
  totalAssets: number;
  totalBrands: number;
  totalSectors: number;
  totalSources: number;
  topSales?: { ref: Reference; metric: { value: number; displayValue?: string; source: string } };
  cultIndexAvg: number;
  distinctPatterns: number;
  decadeDistribution: { label: number; count: number; height: number }[];
}) {
  return (
    <div className="bento">
      {/* Stat : sources documentées */}
      <article className="b-card c-stat">
        <div className="k">Sources documentées</div>
        <div className="big">{totalSources}</div>
        <div className="sub">
          Toutes vérifiables · licence libre, press-kit ou fair-use.{' '}
          <Link href="/admin/ingest" style={{ color: 'inherit', textDecoration: 'underline' }}>
            Soumettre un dossier →
          </Link>
        </div>
      </article>

      {/* Stat tiles */}
      <article className="b-card c-stat dark">
        <div className="k">Indice culte moyen</div>
        <div className="big">
          {cultIndexAvg}
          <span className="u">/100</span>
        </div>
        <div className="sub">
          Moyenne sur les opérations dotées d'une métrique culte mesurable.
        </div>
        <div className="deco" aria-hidden />
      </article>

      <article className="b-card c-stat coral">
        <div className="k">Références indexées</div>
        <div className="big">{totalRefs}</div>
        <div className="sub">
          <b>{totalAssets}</b> assets · <b>{totalBrands}</b> marques · <b>{totalSectors}</b> secteurs
        </div>
        {decadeDistribution.length > 0 && (
          <div className="spark" aria-label="Répartition par décennie">
            {decadeDistribution.map((d) => (
              <span
                key={d.label}
                className="b"
                style={{ height: `${d.height}%` }}
                title={`${d.label}s : ${d.count} référence${d.count > 1 ? 's' : ''}`}
              />
            ))}
          </div>
        )}
      </article>

      <article className="b-card c-stat butter">
        <div className="k">Meilleur lift de ventes</div>
        <div className="big" style={{ color: '#5e4710' }}>
          {topSales ? (topSales.metric.displayValue ?? `+${topSales.metric.value} %`) : '—'}
        </div>
        <div className="sub">
          {topSales ? (
            <>
              <b>{topSales.ref.brandEmitter}</b> &middot; {topSales.ref.title} &middot; {topSales.ref.emissionYear}
            </>
          ) : (
            'Aucune métrique de lift disponible pour l\'instant.'
          )}
        </div>
      </article>

      <article className="b-card c-stat sage">
        <div className="k">Patterns distincts</div>
        <div className="big" style={{ color: '#3e5128' }}>{distinctPatterns}</div>
        <div className="sub">
          Sur les <b>14 pattern kinds</b> de la taxonomie Argos. <Link href="/patterns" style={{ color: '#3e5128', textDecoration: 'underline' }}>Voir tous</Link>.
        </div>
      </article>

      {/* Secondary cards */}
      {secondaries.map((ref, i) => (
        <SecondaryCard key={ref.id} reference={ref} index={i} />
      ))}
    </div>
  );
}

function SecondaryCard({ reference, index }: { reference: Reference; index: number }) {
  const phClass = phaseClassFor(reference.brandEmitter);
  const image = pickImageAsset(reference);
  const salesMetric = reference.performance.metrics.find((m) => m.kind === 'SALES_LIFT_PCT');
  const cultMetric = reference.performance.metrics.find((m) => m.kind === 'CULT_INDEX_0_100');
  const score = reference.performance.composite;
  const accent = reference.victoryTypes[0];
  const accentClass = (['butter', 'coral', 'lav'] as const)[index % 3];
  return (
    <Link href={`/work/${reference.slug}`} className="b-card c-third">
      <div className="top">
        <div className="pills">
          <span className="pill butter">{reference.emissionYear}</span>
          {accent && <span className={`pill ${accentClass}`}>{humanVictory(accent)}</span>}
        </div>
        <div className="more">⋯</div>
      </div>
      <div className={`photo ${phClass}`} style={{ position: 'relative', overflow: 'hidden' }}>
        {image?.url && (
          <Image
            src={image.url}
            alt={image.alt ?? image.caption ?? reference.title}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            style={{ objectFit: 'cover' }}
          />
        )}
      </div>
      <h3>{reference.title}</h3>
      <div className="by">
        <span className="av" aria-hidden />
        <b>{reference.brandEmitter}</b>
        {reference.agencyCreator ? ` · ${reference.agencyCreator}` : ''}
      </div>
      <div className="desc">{shorten(reference.summary, 180)}</div>
      <div className="foot">
        <div className="score">
          {score}
          <span className="lab">Score</span>
        </div>
        <div className="perf">
          {salesMetric ? (
            <>
              <span className="v">{salesMetric.displayValue ?? `+${salesMetric.value} %`}</span>{' '}
              lift ventes
            </>
          ) : cultMetric ? (
            <>
              <span className="v">{cultMetric.value}/100</span> indice culte
            </>
          ) : (
            <span className="v">{humanVictory(reference.victoryTypes[0] ?? '')}</span>
          )}
        </div>
      </div>
    </Link>
  );
}

/* helpers */
function phaseClassFor(seed: string): string {
  let n = 0;
  for (const c of seed) n = (n + c.charCodeAt(0)) % 6;
  return `ph-${n + 1}`;
}

function shorten(s: string, n: number): string {
  if (!s) return '';
  if (s.length <= n) return s;
  return `${s.slice(0, n - 1).trimEnd()}…`;
}

function pickImageAsset(reference: Reference): Asset | undefined {
  return (
    reference.assets.find((a) => a.url && a.kind === 'IMAGE' && a.role === 'HERO') ??
    reference.assets.find((a) => a.url && a.kind === 'IMAGE' && a.role === 'PRIMARY') ??
    reference.assets.find((a) => a.url && a.kind === 'IMAGE' && a.role === 'EXTRACTED') ??
    reference.assets.find((a) => a.url && a.kind === 'IMAGE') ??
    reference.assets.find((a) => a.url && a.posterUrl)
  );
}

function humanVictory(s: string): string {
  if (!s) return '';
  const fr: Record<string, string> = {
    CANNES_LIONS_GOLD: 'Cannes Lions Or',
    CANNES_LIONS_SILVER: 'Cannes Lions Argent',
    CANNES_LIONS_BRONZE: 'Cannes Lions Bronze',
    DANDAD_PENCIL: 'D&AD Pencil',
    EFFIE_GOLD: 'Effie Or',
    LOERIES_GRAND_PRIX: 'Loeries Grand Prix',
    PIKINE_GRAND_PRIX: 'Pikine Grand Prix',
    LOCAL_DOMINANCE_PROVEN: 'Domination locale',
    VIRAL_REACH: 'Reach viral',
    LONGEVITY_PROVEN: 'Longévité prouvée',
    CULT_STATUS_DOCUMENTED: 'Statut culte',
    COMMERCIAL_IMPACT_PROVEN: 'Impact prouvé',
    BRAND_WORLD_DOOR: 'Marque-univers',
    COMPETITOR_IMITATED: 'Imité',
  };
  return fr[s] ?? s.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
