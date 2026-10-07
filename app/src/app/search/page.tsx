import type { Metadata } from 'next';
import Link from 'next/link';
import {
  getAllReferences,
  listAgencies,
  listAssetFunctions,
  listAwards,
  listBrands,
  listManipulationModes,
  listMarkets,
  listOperationGoals,
  listPatternKinds,
  listSectors,
  listStructuralAxes,
  listYears,
  slugify,
} from '@/lib/library';
import {
  ASSET_FUNCTION_LABELS,
  MANIPULATION_MODE_LABELS,
  OPERATION_GOAL_LABELS,
  PATTERN_KIND_LABELS,
  PERFORMANCE_METRIC_LABELS,
  PILLAR_LABELS,
  STRUCTURAL_AXIS_LABELS,
  VICTORY_LABELS,
} from '@/lib/taxonomy';
import type {
  AssetFunction,
  AttributionConfidence,
  ManipulationMode,
  OperationGoal,
  PatternKind,
  PerformanceMetricKind,
  Pillar,
  Reference,
  StructuralAxisName,
  VictoryType,
} from '@/lib/types';

export const metadata: Metadata = {
  title: 'Rechercher dans la bibliothèque',
  description:
    "Recherche classique dans la bibliothèque Argos. Mode simple pour les mots-clés, mode avancé pour la taxonomie complète.",
};

interface SearchPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

interface ParsedQuery {
  q: string;
  mode: 'basic' | 'advanced';
  brand?: string;
  agency?: string;
  sector?: string;
  market?: string;
  yearFrom?: number;
  yearTo?: number;
  victory?: VictoryType;
  patternKind?: PatternKind;
  manipulationMode?: ManipulationMode;
  pillar?: Pillar;
  funnelStage?: string;
  operationGoal?: OperationGoal;
  axis?: StructuralAxisName;
  axisConfMin?: number;
  assetFunction?: AssetFunction;
  assetRole?: string;
  assetKind?: string;
  aspectRatio?: string;
  metricKind?: PerformanceMetricKind;
  metricMin?: number;
  metricMax?: number;
  attribution?: AttributionConfidence;
  ingestPath?: string;
}

function singleParam(
  params: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const v = params[key];
  if (Array.isArray(v)) return v[0];
  return v;
}

function parseQuery(params: Record<string, string | string[] | undefined>): ParsedQuery {
  const num = (k: string) => {
    const v = singleParam(params, k);
    return v ? Number.parseFloat(v) : undefined;
  };
  return {
    q: (singleParam(params, 'q') ?? '').trim(),
    mode: singleParam(params, 'mode') === 'advanced' ? 'advanced' : 'basic',
    brand: singleParam(params, 'brand'),
    agency: singleParam(params, 'agency'),
    sector: singleParam(params, 'sector'),
    market: singleParam(params, 'market'),
    yearFrom: num('yearFrom'),
    yearTo: num('yearTo'),
    victory: singleParam(params, 'victory') as VictoryType | undefined,
    patternKind: singleParam(params, 'patternKind') as PatternKind | undefined,
    manipulationMode: singleParam(params, 'manipulationMode') as ManipulationMode | undefined,
    pillar: singleParam(params, 'pillar') as Pillar | undefined,
    funnelStage: singleParam(params, 'funnelStage'),
    operationGoal: singleParam(params, 'operationGoal') as OperationGoal | undefined,
    axis: singleParam(params, 'axis') as StructuralAxisName | undefined,
    axisConfMin: num('axisConfMin'),
    assetFunction: singleParam(params, 'assetFunction') as AssetFunction | undefined,
    assetRole: singleParam(params, 'assetRole'),
    assetKind: singleParam(params, 'assetKind'),
    aspectRatio: singleParam(params, 'aspectRatio'),
    metricKind: singleParam(params, 'metricKind') as PerformanceMetricKind | undefined,
    metricMin: num('metricMin'),
    metricMax: num('metricMax'),
    attribution: singleParam(params, 'attribution') as AttributionConfidence | undefined,
    ingestPath: singleParam(params, 'ingestPath'),
  };
}

function filterReferences(refs: Reference[], q: ParsedQuery): Reference[] {
  const text = q.q.toLowerCase();
  return refs.filter((r) => {
    if (q.brand && slugify(r.brandEmitter) !== q.brand) return false;
    if (q.agency) {
      if (!r.agencyCreator || slugify(r.agencyCreator) !== q.agency) return false;
    }
    if (q.sector && slugify(r.sector) !== q.sector) return false;
    if (q.market) {
      const inP = slugify(r.marketPrimary) === q.market;
      const inS = r.marketsSecondary.some((m) => slugify(m) === q.market);
      if (!inP && !inS) return false;
    }
    if (q.yearFrom !== undefined && r.emissionYear < q.yearFrom) return false;
    if (q.yearTo !== undefined && r.emissionYear > q.yearTo) return false;
    if (q.victory && !r.victoryTypes.includes(q.victory)) return false;
    if (q.patternKind && r.patternKind !== q.patternKind) return false;
    if (q.manipulationMode && r.manipulationMode !== q.manipulationMode) return false;
    if (q.pillar && !r.pillars.includes(q.pillar)) return false;
    if (q.funnelStage && r.funnelStage !== q.funnelStage) return false;
    if (q.operationGoal && !r.operationGoals.includes(q.operationGoal)) return false;
    if (q.axis) {
      const ax = r.axes.find((a) => a.name === q.axis);
      if (!ax) return false;
      if (q.axisConfMin !== undefined && ax.confidence < q.axisConfMin) return false;
    }
    if (q.assetFunction || q.assetRole || q.assetKind || q.aspectRatio) {
      const ok = r.assets.some(
        (a) =>
          (!q.assetFunction || a.function === q.assetFunction) &&
          (!q.assetRole || a.role === q.assetRole) &&
          (!q.assetKind || a.kind === q.assetKind) &&
          (!q.aspectRatio || a.aspectRatio === q.aspectRatio),
      );
      if (!ok) return false;
    }
    if (q.metricKind || q.metricMin !== undefined || q.metricMax !== undefined || q.attribution) {
      const ok = r.performance.metrics.some((m) => {
        if (q.metricKind && m.kind !== q.metricKind) return false;
        if (q.metricMin !== undefined && m.value < q.metricMin) return false;
        if (q.metricMax !== undefined && m.value > q.metricMax) return false;
        if (q.attribution && m.attribution !== q.attribution) return false;
        return true;
      });
      if (!ok) return false;
    }
    if (text) {
      const hay = [
        r.title,
        r.brandEmitter,
        r.agencyCreator ?? '',
        r.sector,
        r.marketPrimary,
        ...r.marketsSecondary,
        r.summary,
        r.patternObservation ?? '',
        r.significance ?? '',
        ...r.assets.flatMap((a) => [a.text ?? '', a.caption ?? '', a.format ?? '']),
        ...r.axes.flatMap((a) => [a.value, a.evidence ?? '']),
      ]
        .join(' ')
        .toLowerCase();
      if (!hay.includes(text)) return false;
    }
    return true;
  });
}

function buildHref(current: ParsedQuery, override: Partial<ParsedQuery & { unset?: keyof ParsedQuery }>): string {
  const params = new URLSearchParams();
  const merged: Record<string, string | undefined> = {
    q: current.q || undefined,
    mode: current.mode === 'advanced' ? 'advanced' : undefined,
    brand: current.brand,
    agency: current.agency,
    sector: current.sector,
    market: current.market,
    yearFrom: current.yearFrom?.toString(),
    yearTo: current.yearTo?.toString(),
    victory: current.victory,
    patternKind: current.patternKind,
    manipulationMode: current.manipulationMode,
    pillar: current.pillar,
    funnelStage: current.funnelStage,
    operationGoal: current.operationGoal,
    axis: current.axis,
    axisConfMin: current.axisConfMin?.toString(),
    assetFunction: current.assetFunction,
    assetRole: current.assetRole,
    assetKind: current.assetKind,
    aspectRatio: current.aspectRatio,
    metricKind: current.metricKind,
    metricMin: current.metricMin?.toString(),
    metricMax: current.metricMax?.toString(),
    attribution: current.attribution,
    ingestPath: current.ingestPath,
  };
  for (const [k, v] of Object.entries(override)) {
    if (k === 'unset') continue;
    if (v === undefined) {
      delete merged[k];
    } else if (typeof v === 'number') {
      merged[k] = String(v);
    } else if (typeof v === 'string') {
      merged[k] = v;
    }
  }
  if (override.unset && typeof override.unset === 'string') {
    delete merged[override.unset];
  }
  for (const [k, v] of Object.entries(merged)) {
    if (v) params.set(k, v);
  }
  const s = params.toString();
  return s ? `/search?${s}` : '/search';
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const raw = await searchParams;
  const query = parseQuery(raw);

  const [all, brands, agencies, sectors, markets, years, awards, modes, kinds, axes, functions, goals] =
    await Promise.all([
      getAllReferences(),
      listBrands(),
      listAgencies(),
      listSectors(),
      listMarkets(),
      listYears(),
      listAwards(),
      listManipulationModes(),
      listPatternKinds(),
      listStructuralAxes(),
      listAssetFunctions(),
      listOperationGoals(),
    ]);

  const results = filterReferences(all, query);
  const advanced = query.mode === 'advanced';
  const activeFilters = listActiveFilters(query);

  return (
    <section className="view">
      <div className="wrap">
        <header style={{ marginBottom: 18 }}>
          <p
            className="mono"
            style={{
              fontSize: 10.5,
              color: 'var(--ink-3)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              margin: 0,
              marginBottom: 8,
            }}
          >
            Recherche · classique, entièrement facettée
          </p>
          <h1
            style={{
              fontSize: 44,
              letterSpacing: '-0.025em',
              margin: 0,
              fontWeight: 600,
            }}
          >
            Trouver une référence <span className="serif">par n'importe quel tag</span>.
          </h1>
        </header>

        <SearchBar query={query} resultCount={results.length} totalCount={all.length} />

        {activeFilters.length > 0 && (
          <ActiveFilters query={query} activeFilters={activeFilters} />
        )}

        <div className="search-page">
          <FacetRail
            query={query}
            advanced={advanced}
            brands={brands}
            agencies={agencies}
            sectors={sectors}
            markets={markets}
            years={years}
            awards={awards}
            modes={modes}
            kinds={kinds}
            axes={axes}
            functions={functions}
            goals={goals}
          />

          <div className="search-results">
            {results.length === 0 ? (
              <EmptyState query={query} />
            ) : (
              results.map((r) => <ResultRow key={r.id} reference={r} query={query} />)
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function SearchBar({
  query,
  resultCount,
  totalCount,
}: {
  query: ParsedQuery;
  resultCount: number;
  totalCount: number;
}) {
  const advancedHref = buildHref(query, { mode: 'advanced' });
  const basicHref = buildHref(query, { mode: undefined });
  return (
    <search className="search-bar-wrap">
      <form action="/search" method="get">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <title>Recherche</title>
          <circle cx="7" cy="7" r="4.5" />
          <path d="m10.5 10.5 3 3" />
        </svg>
        <input
          name="q"
          defaultValue={query.q}
          placeholder="Cherchez : « Just Do It », « Think Different », « Don't Buy This Jacket »…"
          aria-label="Recherche"
        />
        {query.mode === 'advanced' && <input type="hidden" name="mode" value="advanced" />}
        <button className="go" type="submit">
          Chercher <span style={{ fontSize: 11, opacity: 0.7 }}>⏎</span>
        </button>
      </form>
      <div className="mode-row">
        <div className="mode" role="tablist">
          <Link href={basicHref} className={query.mode === 'basic' ? 'on' : ''} role="tab">
            Simple
          </Link>
          <Link href={advancedHref} className={query.mode === 'advanced' ? 'on' : ''} role="tab">
            Avancée
          </Link>
        </div>
        <div className="stats">
          <b>{resultCount}</b> résultat{resultCount > 1 ? 's' : ''} ·{' '}
          {totalCount.toLocaleString('fr-FR')} indexée{totalCount > 1 ? 's' : ''}
        </div>
      </div>
    </search>
  );
}

function ActiveFilters({
  query,
  activeFilters,
}: {
  query: ParsedQuery;
  activeFilters: Array<{ key: keyof ParsedQuery; label: string }>;
}) {
  return (
    <div className="active-filters">
      <span className="lab">Filtres actifs :</span>
      {activeFilters.map((f) => (
        <Link key={f.key} href={buildHref(query, { unset: f.key, [f.key]: undefined } as Partial<ParsedQuery & { unset?: keyof ParsedQuery }>)} className="ftag">
          {f.label}
          <span className="x" aria-hidden>×</span>
        </Link>
      ))}
      <Link href="/search" className="facet-clear">
        Tout effacer
      </Link>
    </div>
  );
}

function FacetRail({
  query,
  advanced,
  brands,
  agencies,
  sectors,
  markets,
  years,
  awards,
  modes,
  kinds,
  axes,
  functions,
  goals,
}: {
  query: ParsedQuery;
  advanced: boolean;
  brands: Array<{ slug: string; label: string; count: number }>;
  agencies: Array<{ slug: string; label: string; count: number }>;
  sectors: Array<{ slug: string; label: string; count: number }>;
  markets: Array<{ slug: string; label: string; count: number }>;
  years: Array<{ value: number; count: number }>;
  awards: Array<{ value: VictoryType; slug: string; count: number }>;
  modes: Array<{ value: ManipulationMode; count: number }>;
  kinds: Array<{ value: PatternKind; count: number }>;
  axes: Array<{ value: StructuralAxisName; count: number }>;
  functions: Array<{ value: AssetFunction; count: number }>;
  goals: Array<{ value: OperationGoal; count: number }>;
}) {
  return (
    <aside className="facet-rail" aria-label="Filtres">
      <h2>Filtres</h2>

      {/* BASIC FACETS — visible in both modes */}
      <div className="facet-grp">
        <h3>Secteur</h3>
        <div className="opts">
          {sectors.slice(0, advanced ? sectors.length : 6).map((s) => (
            <Link
              key={s.slug}
              href={buildHref(query, { sector: query.sector === s.slug ? undefined : s.slug })}
              className={query.sector === s.slug ? 'on' : ''}
            >
              <span>{s.label}</span>
              <span className="ct">{s.count}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="facet-grp">
        <h3>Marque</h3>
        <div className="opts">
          {brands.slice(0, advanced ? brands.length : 6).map((b) => (
            <Link
              key={b.slug}
              href={buildHref(query, { brand: query.brand === b.slug ? undefined : b.slug })}
              className={query.brand === b.slug ? 'on' : ''}
            >
              <span>{b.label}</span>
              <span className="ct">{b.count}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="facet-grp">
        <h3>Marché</h3>
        <div className="opts">
          {markets.slice(0, advanced ? markets.length : 6).map((m) => (
            <Link
              key={m.slug}
              href={buildHref(query, { market: query.market === m.slug ? undefined : m.slug })}
              className={query.market === m.slug ? 'on' : ''}
            >
              <span>{m.label}</span>
              <span className="ct">{m.count}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="facet-grp">
        <h3>Année</h3>
        <form action="/search" method="get" className="ranges" style={{ marginBottom: 8 }}>
          <HiddenStateExceptYears query={query} />
          <input
            type="number"
            name="yearFrom"
            placeholder="Depuis"
            defaultValue={query.yearFrom ?? ''}
            min={1900}
            max={2100}
          />
          <input
            type="number"
            name="yearTo"
            placeholder="Jusque"
            defaultValue={query.yearTo ?? ''}
            min={1900}
            max={2100}
          />
        </form>
        <div className="opts">
          {years.slice(0, advanced ? 12 : 6).map((y) => (
            <Link
              key={y.value}
              href={buildHref(query, {
                yearFrom: query.yearFrom === y.value ? undefined : y.value,
                yearTo: query.yearTo === y.value ? undefined : y.value,
              })}
              className={query.yearFrom === y.value && query.yearTo === y.value ? 'on' : ''}
            >
              <span>{y.value}</span>
              <span className="ct">{y.count}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="facet-grp">
        <h3>Award / victoire</h3>
        <div className="opts">
          {awards.slice(0, advanced ? awards.length : 6).map((a) => (
            <Link
              key={a.slug}
              href={buildHref(query, { victory: query.victory === a.value ? undefined : a.value })}
              className={query.victory === a.value ? 'on' : ''}
            >
              <span>{VICTORY_LABELS[a.value]}</span>
              <span className="ct">{a.count}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* ADVANCED FACETS — only in advanced mode */}
      {advanced && (
        <>
          <div className="facet-grp">
            <h3>Agence</h3>
            <div className="opts">
              {agencies.map((a) => (
                <Link
                  key={a.slug}
                  href={buildHref(query, {
                    agency: query.agency === a.slug ? undefined : a.slug,
                  })}
                  className={query.agency === a.slug ? 'on' : ''}
                >
                  <span>{a.label}</span>
                  <span className="ct">{a.count}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="facet-grp">
            <h3>Pattern kind</h3>
            <div className="opts">
              {kinds.map((k) => (
                <Link
                  key={k.value}
                  href={buildHref(query, {
                    patternKind: query.patternKind === k.value ? undefined : k.value,
                  })}
                  className={query.patternKind === k.value ? 'on' : ''}
                >
                  <span>{PATTERN_KIND_LABELS[k.value]}</span>
                  <span className="ct">{k.count}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="facet-grp">
            <h3>Posture</h3>
            <div className="opts">
              {modes.map((m) => (
                <Link
                  key={m.value}
                  href={buildHref(query, {
                    manipulationMode: query.manipulationMode === m.value ? undefined : m.value,
                  })}
                  className={query.manipulationMode === m.value ? 'on' : ''}
                >
                  <span>{MANIPULATION_MODE_LABELS[m.value]}</span>
                  <span className="ct">{m.count}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="facet-grp">
            <h3>Objectif d'opération</h3>
            <div className="opts">
              {goals.map((g) => (
                <Link
                  key={g.value}
                  href={buildHref(query, {
                    operationGoal: query.operationGoal === g.value ? undefined : g.value,
                  })}
                  className={query.operationGoal === g.value ? 'on' : ''}
                >
                  <span>{OPERATION_GOAL_LABELS[g.value]}</span>
                  <span className="ct">{g.count}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="facet-grp">
            <h3>Pilier (ADVE+)</h3>
            <div className="opts">
              {(Object.keys(PILLAR_LABELS) as Pillar[]).map((p) => (
                <Link
                  key={p}
                  href={buildHref(query, { pillar: query.pillar === p ? undefined : p })}
                  className={query.pillar === p ? 'on' : ''}
                >
                  <span>
                    {p} · {PILLAR_LABELS[p]}
                  </span>
                  <span className="ct">—</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="facet-grp">
            <h3>Étape funnel</h3>
            <div className="opts">
              {['AWARENESS', 'CONSIDERATION', 'CONVERSION', 'RETENTION', 'ADVOCACY'].map((f) => (
                <Link
                  key={f}
                  href={buildHref(query, {
                    funnelStage: query.funnelStage === f ? undefined : f,
                  })}
                  className={query.funnelStage === f ? 'on' : ''}
                >
                  <span>{f.charAt(0) + f.slice(1).toLowerCase()}</span>
                  <span className="ct">—</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="facet-grp">
            <h3>Axe structurel</h3>
            <div className="opts">
              {axes.slice(0, 12).map((a) => (
                <Link
                  key={a.value}
                  href={buildHref(query, { axis: query.axis === a.value ? undefined : a.value })}
                  className={query.axis === a.value ? 'on' : ''}
                >
                  <span>{STRUCTURAL_AXIS_LABELS[a.value]}</span>
                  <span className="ct">{a.count}</span>
                </Link>
              ))}
            </div>
            {query.axis && (
              <form action="/search" method="get" className="ranges" style={{ marginTop: 8 }}>
                <HiddenStateExceptKey query={query} except="axisConfMin" />
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  max="1"
                  name="axisConfMin"
                  placeholder="Conf. min 0-1"
                  defaultValue={query.axisConfMin ?? ''}
                />
              </form>
            )}
          </div>

          <div className="facet-grp">
            <h3>Fonction d'asset</h3>
            <div className="opts">
              {functions.slice(0, 14).map((f) => (
                <Link
                  key={f.value}
                  href={buildHref(query, {
                    assetFunction: query.assetFunction === f.value ? undefined : f.value,
                  })}
                  className={query.assetFunction === f.value ? 'on' : ''}
                >
                  <span>{ASSET_FUNCTION_LABELS[f.value]}</span>
                  <span className="ct">{f.count}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="facet-grp">
            <h3>Rôle d'asset</h3>
            <div className="opts">
              {['HERO', 'PRIMARY', 'DECLINATION', 'COMPANION', 'EXTRACTED'].map((r) => (
                <Link
                  key={r}
                  href={buildHref(query, {
                    assetRole: query.assetRole === r ? undefined : r,
                  })}
                  className={query.assetRole === r ? 'on' : ''}
                >
                  <span>{r.charAt(0) + r.slice(1).toLowerCase()}</span>
                  <span className="ct">—</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="facet-grp">
            <h3>Kind d'asset</h3>
            <div className="opts">
              {['IMAGE', 'VIDEO', 'AUDIO', 'TEXT', 'EMBED_YOUTUBE', 'EMBED_VIMEO'].map((k) => (
                <Link
                  key={k}
                  href={buildHref(query, { assetKind: query.assetKind === k ? undefined : k })}
                  className={query.assetKind === k ? 'on' : ''}
                >
                  <span>{k.replace('EMBED_', '').toLowerCase()}</span>
                  <span className="ct">—</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="facet-grp">
            <h3>Ratio</h3>
            <div className="opts">
              {['1:1', '4:3', '3:4', '16:9', '9:16', '21:9', '4:5'].map((ar) => (
                <Link
                  key={ar}
                  href={buildHref(query, {
                    aspectRatio: query.aspectRatio === ar ? undefined : ar,
                  })}
                  className={query.aspectRatio === ar ? 'on' : ''}
                >
                  <span className="mono">{ar}</span>
                  <span className="ct">—</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="facet-grp">
            <h3>Métrique</h3>
            <div className="opts">
              {(Object.keys(PERFORMANCE_METRIC_LABELS) as PerformanceMetricKind[])
                .slice(0, 10)
                .map((m) => (
                  <Link
                    key={m}
                    href={buildHref(query, {
                      metricKind: query.metricKind === m ? undefined : m,
                    })}
                    className={query.metricKind === m ? 'on' : ''}
                  >
                    <span>{PERFORMANCE_METRIC_LABELS[m]}</span>
                    <span className="ct">—</span>
                  </Link>
                ))}
            </div>
            {query.metricKind && (
              <form action="/search" method="get" className="ranges" style={{ marginTop: 8 }}>
                <HiddenStateExceptKey query={query} except="metricMin" />
                <input
                  type="number"
                  step="any"
                  name="metricMin"
                  placeholder="Min"
                  defaultValue={query.metricMin ?? ''}
                />
                <input
                  type="number"
                  step="any"
                  name="metricMax"
                  placeholder="Max"
                  defaultValue={query.metricMax ?? ''}
                />
              </form>
            )}
          </div>

          <div className="facet-grp">
            <h3>Attribution</h3>
            <div className="opts">
              {(['PROVEN_CAUSAL', 'CORRELATED', 'ESTIMATED', 'CLAIMED'] as AttributionConfidence[]).map(
                (a) => (
                  <Link
                    key={a}
                    href={buildHref(query, {
                      attribution: query.attribution === a ? undefined : a,
                    })}
                    className={query.attribution === a ? 'on' : ''}
                  >
                    <span>{a.toLowerCase().replace('_', ' ')}</span>
                    <span className="ct">—</span>
                  </Link>
                ),
              )}
            </div>
          </div>

          <div className="facet-grp">
            <h3>Voie d'ingestion</h3>
            <div className="opts">
              {['manual-dossier', 'crawler-watch', 'mock'].map((p) => (
                <Link
                  key={p}
                  href={buildHref(query, {
                    ingestPath: query.ingestPath === p ? undefined : p,
                  })}
                  className={query.ingestPath === p ? 'on' : ''}
                >
                  <span>{p}</span>
                  <span className="ct">—</span>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </aside>
  );
}

function HiddenStateExceptYears({ query }: { query: ParsedQuery }) {
  return (
    <>
      {query.q && <input type="hidden" name="q" value={query.q} />}
      {query.mode === 'advanced' && <input type="hidden" name="mode" value="advanced" />}
      {query.brand && <input type="hidden" name="brand" value={query.brand} />}
      {query.sector && <input type="hidden" name="sector" value={query.sector} />}
      {query.market && <input type="hidden" name="market" value={query.market} />}
    </>
  );
}

function HiddenStateExceptKey({ query, except }: { query: ParsedQuery; except: string }) {
  const entries: Array<[string, string | undefined]> = [
    ['q', query.q || undefined],
    ['mode', query.mode === 'advanced' ? 'advanced' : undefined],
    ['brand', query.brand],
    ['agency', query.agency],
    ['sector', query.sector],
    ['market', query.market],
    ['yearFrom', query.yearFrom?.toString()],
    ['yearTo', query.yearTo?.toString()],
    ['victory', query.victory],
    ['patternKind', query.patternKind],
    ['manipulationMode', query.manipulationMode],
    ['pillar', query.pillar],
    ['funnelStage', query.funnelStage],
    ['operationGoal', query.operationGoal],
    ['axis', query.axis],
    ['axisConfMin', query.axisConfMin?.toString()],
    ['assetFunction', query.assetFunction],
    ['assetRole', query.assetRole],
    ['assetKind', query.assetKind],
    ['aspectRatio', query.aspectRatio],
    ['metricKind', query.metricKind],
    ['metricMin', query.metricMin?.toString()],
    ['metricMax', query.metricMax?.toString()],
    ['attribution', query.attribution],
    ['ingestPath', query.ingestPath],
  ];
  return (
    <>
      {entries
        .filter(([k, v]) => k !== except && v)
        .map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v ?? ''} />
        ))}
    </>
  );
}

function ResultRow({ reference: r, query }: { reference: Reference; query: ParsedQuery }) {
  const phClass = `ph-${((r.brandEmitter.length + r.emissionYear) % 6) + 1}`;
  const top = r.victoryTypes[0];
  const why = whyMatches(r, query);
  return (
    <Link href={`/work/${r.slug}`} className="result-row">
      <div className={`ph ${phClass}`}>
        <span className="yr">{r.emissionYear}</span>
      </div>
      <div className="body">
        <div className="pills">
          <span className="pill butter">{r.sector}</span>
          <span className="pill">{r.marketPrimary}</span>
          {r.manipulationMode && (
            <span className="pill sage">
              {r.manipulationMode.charAt(0) + r.manipulationMode.slice(1).toLowerCase()}
            </span>
          )}
        </div>
        <h3>{r.title}</h3>
        <div className="by">
          <b>{r.brandEmitter}</b>
          {r.agencyCreator ? ` · ${r.agencyCreator}` : ''}
        </div>
        <p className="sum">{r.summary}</p>
        {why && <p className="why">{why}</p>}
      </div>
      <div className="meta">
        <div className="sc">{r.performance.composite}</div>
        <div className="sc-lab">Score</div>
        {top && <div className="victory">{VICTORY_LABELS[top]}</div>}
      </div>
    </Link>
  );
}

function whyMatches(r: Reference, q: ParsedQuery): string | null {
  if (q.axis) {
    const axis = r.axes.find((a) => a.name === q.axis);
    if (axis)
      return `Match sur l'axe ${STRUCTURAL_AXIS_LABELS[q.axis]} · confidence ${axis.confidence.toFixed(2)}`;
  }
  if (q.metricKind) {
    const m = r.performance.metrics.find((m) => m.kind === q.metricKind);
    if (m)
      return `Métrique ${PERFORMANCE_METRIC_LABELS[q.metricKind]} · ${m.displayValue ?? m.value}`;
  }
  if (q.assetFunction) {
    const a = r.assets.find((a) => a.function === q.assetFunction);
    if (a)
      return `Bundle contient un ${ASSET_FUNCTION_LABELS[q.assetFunction]} (rôle : ${a.role})`;
  }
  return null;
}

function EmptyState({ query }: { query: ParsedQuery }) {
  return (
    <div className="empty-results">
      <h2>
        Aucun <span className="serif">résultat</span>.
      </h2>
      <p>
        {query.q
          ? `Argos n'a pas de référence qualifiée pour « ${query.q} » avec les filtres actifs.`
          : "Aucune référence ne correspond aux filtres actifs."}{' '}
        Élargissez un filtre, ou soumettez un dossier de recherche via{' '}
        <Link href="/admin/ingest" style={{ color: 'var(--coral)' }}>
          /admin/ingest
        </Link>
        .
      </p>
    </div>
  );
}

function listActiveFilters(q: ParsedQuery): Array<{ key: keyof ParsedQuery; label: string }> {
  const out: Array<{ key: keyof ParsedQuery; label: string }> = [];
  if (q.brand) out.push({ key: 'brand', label: `Marque : ${q.brand}` });
  if (q.agency) out.push({ key: 'agency', label: `Agence : ${q.agency}` });
  if (q.sector) out.push({ key: 'sector', label: `Secteur : ${q.sector}` });
  if (q.market) out.push({ key: 'market', label: `Marché : ${q.market}` });
  if (q.yearFrom !== undefined) out.push({ key: 'yearFrom', label: `Depuis ${q.yearFrom}` });
  if (q.yearTo !== undefined) out.push({ key: 'yearTo', label: `Jusque ${q.yearTo}` });
  if (q.victory) out.push({ key: 'victory', label: VICTORY_LABELS[q.victory] });
  if (q.patternKind) out.push({ key: 'patternKind', label: PATTERN_KIND_LABELS[q.patternKind] });
  if (q.manipulationMode)
    out.push({ key: 'manipulationMode', label: MANIPULATION_MODE_LABELS[q.manipulationMode] });
  if (q.pillar) out.push({ key: 'pillar', label: `Pilier ${q.pillar}` });
  if (q.funnelStage) out.push({ key: 'funnelStage', label: `Funnel : ${q.funnelStage}` });
  if (q.operationGoal)
    out.push({ key: 'operationGoal', label: OPERATION_GOAL_LABELS[q.operationGoal] });
  if (q.axis)
    out.push({
      key: 'axis',
      label: `Axe : ${STRUCTURAL_AXIS_LABELS[q.axis]}${q.axisConfMin ? ` ≥${q.axisConfMin}` : ''}`,
    });
  if (q.assetFunction)
    out.push({ key: 'assetFunction', label: `Asset : ${ASSET_FUNCTION_LABELS[q.assetFunction]}` });
  if (q.assetRole) out.push({ key: 'assetRole', label: `Rôle : ${q.assetRole}` });
  if (q.assetKind) out.push({ key: 'assetKind', label: `Kind : ${q.assetKind}` });
  if (q.aspectRatio) out.push({ key: 'aspectRatio', label: `Ratio : ${q.aspectRatio}` });
  if (q.metricKind) {
    const r =
      q.metricMin !== undefined || q.metricMax !== undefined
        ? ` ${q.metricMin ?? '−∞'}–${q.metricMax ?? '+∞'}`
        : '';
    out.push({ key: 'metricKind', label: `${PERFORMANCE_METRIC_LABELS[q.metricKind]}${r}` });
  }
  if (q.attribution) out.push({ key: 'attribution', label: `Attribution : ${q.attribution}` });
  if (q.ingestPath) out.push({ key: 'ingestPath', label: `Voie : ${q.ingestPath}` });
  return out;
}
