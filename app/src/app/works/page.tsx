import type { Metadata } from 'next';
import Link from 'next/link';
import { getAllReferences } from '@/lib/library';
import type { Reference } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Toutes les opérations — bibliothèque',
  description: 'Toutes les références indexées dans Argos, triables et navigables.',
};

interface WorksPageProps {
  searchParams: Promise<{ sort?: string }>;
}

export default async function WorksPage({ searchParams }: WorksPageProps) {
  const { sort = 'recent' } = await searchParams;
  const refs = sortRefs(await getAllReferences(), sort);
  const totalAssets = refs.reduce((sum, r) => sum + r.assets.length, 0);
  const totalMetrics = refs.reduce((sum, r) => sum + r.performance.metrics.length, 0);

  return (
    <section className="view">
      <div className="wrap entity-page">
        <header className="entity-hero">
          <div className="eyebrow">Toutes les opérations · bibliothèque</div>
          <h1>
            Chaque opération, <span className="serif">à parcourir.</span>
          </h1>
          <p className="deck">
            <b>{refs.length}</b> opération{refs.length > 1 ? 's' : ''} indexée
            {refs.length > 1 ? 's' : ''} · {totalAssets} assets · {totalMetrics} métriques de performance.
            Tri <b>{sortLabel(sort)}</b>.
          </p>
          <div
            style={{
              display: 'flex',
              gap: 8,
              marginTop: 20,
              paddingTop: 20,
              borderTop: '1px solid var(--line)',
              flexWrap: 'wrap',
            }}
          >
            <SortLink label="Récentes" sort="recent" current={sort} />
            <SortLink label="Anciennes" sort="oldest" current={sort} />
            <SortLink label="Score ↓" sort="composite" current={sort} />
            <SortLink label="Plus d'assets" sort="assets" current={sort} />
          </div>
        </header>

        <div className="search-results">
          {refs.map((r) => (
            <WorkRow key={r.id} reference={r} />
          ))}
        </div>
      </div>
    </section>
  );
}

function SortLink({
  label,
  sort,
  current,
}: {
  label: string;
  sort: string;
  current: string;
}) {
  const isOn = current === sort;
  return (
    <Link
      href={`/works?sort=${sort}`}
      className={`pill${isOn ? ' coral-solid' : ''}`}
      style={{ textDecoration: 'none' }}
    >
      {label}
    </Link>
  );
}

function WorkRow({ reference: r }: { reference: Reference }) {
  const phClass = `ph-${((r.brandEmitter.length + r.emissionYear) % 6) + 1}`;
  return (
    <Link href={`/work/${r.slug}`} className="result-row">
      <div className={`ph ${phClass}`}>
        <span className="yr">{r.emissionYear}</span>
      </div>
      <div className="body">
        <div className="pills">
          <span className="pill butter">{r.sector}</span>
          <span className="pill">{r.marketPrimary}</span>
        </div>
        <h3>{r.title}</h3>
        <div className="by">
          <b>{r.brandEmitter}</b>
          {r.agencyCreator ? ` · ${r.agencyCreator}` : ''}
        </div>
        <p className="sum">{r.summary}</p>
      </div>
      <div className="meta">
        <div className="sc">{r.performance.composite}</div>
        <div className="sc-lab">{r.assets.length} asset{r.assets.length > 1 ? 's' : ''}</div>
      </div>
    </Link>
  );
}

function sortRefs(refs: Reference[], sort: string): Reference[] {
  const copy = [...refs];
  switch (sort) {
    case 'oldest':
      return copy.sort((a, b) => a.emissionYear - b.emissionYear);
    case 'composite':
      return copy.sort((a, b) => b.performance.composite - a.performance.composite);
    case 'assets':
      return copy.sort((a, b) => b.assets.length - a.assets.length);
    case 'recent':
    default:
      return copy.sort((a, b) => b.emissionYear - a.emissionYear);
  }
}

function sortLabel(s: string): string {
  switch (s) {
    case 'oldest':
      return 'plus anciennes en premier';
    case 'composite':
      return 'par score ↓';
    case 'assets':
      return 'par nombre d\'assets ↓';
    default:
      return 'plus récentes en premier';
  }
}
