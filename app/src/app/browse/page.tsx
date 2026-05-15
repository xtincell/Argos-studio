import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ASSET_FUNCTION_LABELS,
  MANIPULATION_MODE_LABELS,
  OPERATION_GOAL_LABELS,
  PATTERN_KIND_LABELS,
  PILLAR_LABELS,
  STRUCTURAL_AXIS_LABELS,
  VICTORY_LABELS,
} from '@/lib/taxonomy';
import {
  getAllAssets,
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
} from '@/lib/library';

export const metadata: Metadata = {
  title: 'Browse the library',
  description:
    'Every dimension Argos knows about. Brand, agency, market, year, sector, award, manipulation mode, structural axis, asset function, operation goal, pillar.',
};

export default async function BrowsePage() {
  const [
    refs,
    assets,
    brands,
    agencies,
    markets,
    years,
    sectors,
    awards,
    modes,
    kinds,
    axes,
    functions,
    goals,
  ] = await Promise.all([
    getAllReferences(),
    getAllAssets(),
    listBrands(),
    listAgencies(),
    listMarkets(),
    listYears(),
    listSectors(),
    listAwards(),
    listManipulationModes(),
    listPatternKinds(),
    listStructuralAxes(),
    listAssetFunctions(),
    listOperationGoals(),
  ]);

  return (
    <section className="view">
      <div className="wrap entity-page">
        <header className="entity-hero">
          <div className="eyebrow">Browse · every dimension</div>
          <h1>
            Every dimension <span className="serif">Argos</span> knows about.
          </h1>
          <p className="deck">
            <b>{refs.length}</b> operations composed of <b>{assets.length}</b> assets. The library
            is browsable by every dimension the taxonomy carries — pick an entry point below.
          </p>
          <div
            style={{
              display: 'flex',
              gap: 8,
              marginTop: 18,
              paddingTop: 18,
              borderTop: '1px solid var(--line)',
              flexWrap: 'wrap',
            }}
          >
            <Link href="/works" className="pill coral-solid" style={{ textDecoration: 'none' }}>
              → All works
            </Link>
            <Link href="/assets" className="pill" style={{ textDecoration: 'none' }}>
              → All assets
            </Link>
            <Link href="/search" className="pill" style={{ textDecoration: 'none' }}>
              → Search · advanced
            </Link>
          </div>
        </header>

        <Section title="Brands" subtitle={`${brands.length} indexed`}>
          <FacetGrid items={brands} hrefBase="/brand" />
        </Section>

        <Section title="Agencies" subtitle={`${agencies.length} indexed`}>
          <FacetGrid items={agencies} hrefBase="/agency" />
        </Section>

        <Section title="Markets" subtitle={`${markets.length} indexed`}>
          <FacetGrid items={markets} hrefBase="/market" />
        </Section>

        <Section title="Sectors" subtitle={`${sectors.length} indexed`}>
          <FacetGrid items={sectors} hrefBase="/sector" />
        </Section>

        <Section title="Years" subtitle={`${years.length} years covered`}>
          <FacetGrid
            items={years.map((y) => ({
              value: y.value,
              label: y.label,
              slug: String(y.value),
              count: y.count,
            }))}
            hrefBase="/year"
          />
        </Section>

        <Section title="Awards & victory types" subtitle={`${awards.length} types`}>
          <FacetGrid
            items={awards.map((a) => ({
              value: a.value,
              label: VICTORY_LABELS[a.value],
              slug: a.slug,
              count: a.count,
            }))}
            hrefBase="/award"
          />
        </Section>

        <Section title="Manipulation modes" subtitle="4 postures">
          <FacetGrid
            items={modes.map((m) => ({
              value: m.value,
              label: MANIPULATION_MODE_LABELS[m.value],
              slug: m.slug,
              count: m.count,
            }))}
            hrefBase="/by/manipulation-mode"
          />
        </Section>

        <Section title="Pattern kinds" subtitle="14 kinds">
          <FacetGrid
            items={kinds.map((k) => ({
              value: k.value,
              label: PATTERN_KIND_LABELS[k.value],
              slug: k.slug,
              count: k.count,
            }))}
            hrefBase="/by/pattern-kind"
          />
        </Section>

        <Section title="Structural axes" subtitle={`${axes.length} axes attributed`}>
          <FacetGrid
            items={axes.map((a) => ({
              value: a.value,
              label: STRUCTURAL_AXIS_LABELS[a.value],
              slug: a.slug,
              count: a.count,
            }))}
            hrefBase="/by/axis"
          />
        </Section>

        <Section title="Asset functions" subtitle={`${functions.length} types in use`}>
          <FacetGrid
            items={functions.map((f) => ({
              value: f.value,
              label: ASSET_FUNCTION_LABELS[f.value],
              slug: f.slug,
              count: f.count,
            }))}
            hrefBase="/by/asset-function"
          />
        </Section>

        <Section title="Operation goals" subtitle={`${goals.length} goals attributed`}>
          <FacetGrid
            items={goals.map((g) => ({
              value: g.value,
              label: OPERATION_GOAL_LABELS[g.value],
              slug: g.slug,
              count: g.count,
            }))}
            hrefBase="/by/operation-goal"
          />
        </Section>

        <Section title="Pillars (ADVE+)" subtitle="8 strategic pillars">
          <FacetGrid
            items={(Object.keys(PILLAR_LABELS) as (keyof typeof PILLAR_LABELS)[]).map((p) => ({
              value: p,
              label: `${p} · ${PILLAR_LABELS[p]}`,
              slug: p.toLowerCase(),
              count: refs.filter((r) => r.pillars.includes(p)).length,
            }))}
            hrefBase="/by/pillar"
          />
        </Section>
      </div>
    </section>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ marginBottom: 28 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 12,
          gap: 12,
        }}
      >
        <h2
          style={{
            fontSize: 22,
            margin: 0,
            letterSpacing: '-0.02em',
            fontWeight: 600,
          }}
        >
          {title}
        </h2>
        <p
          className="mono"
          style={{
            fontSize: 10.5,
            color: 'var(--ink-3)',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            margin: 0,
          }}
        >
          {subtitle}
        </p>
      </div>
      {children}
    </section>
  );
}

function FacetGrid<T extends string | number>({
  items,
  hrefBase,
}: {
  items: { value: T; label: string; slug: string; count: number }[];
  hrefBase: string;
}) {
  if (items.length === 0) {
    return (
      <p style={{ fontSize: 12, color: 'var(--ink-3)', fontStyle: 'italic' }}>
        Nothing indexed yet. The crawler will fill in as it runs.
      </p>
    );
  }
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
      {items.map((item) => (
        <Link
          key={item.slug}
          href={`${hrefBase}/${item.slug}`}
          className="pill"
          style={{ textDecoration: 'none', display: 'inline-flex', gap: 8 }}
        >
          <span>{item.label}</span>
          <span
            className="mono"
            style={{ fontSize: 10.5, color: 'var(--ink-4)' }}
          >
            {item.count}
          </span>
        </Link>
      ))}
    </div>
  );
}
