import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { EntityPageShell } from '@/components/entity-page-shell';
import { getReferencesByBrand, slugify } from '@/lib/library';

// Canonical library data changes after admission; never freeze its identities at build time.
export const dynamic = 'force-dynamic';

interface BrandPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: BrandPageProps): Promise<Metadata> {
  const { slug } = await params;
  const refs = await getReferencesByBrand(slug);
  if (refs.length === 0) return { title: 'Marque introuvable' };
  const first = refs[0]!;
  return {
    title: `${first.brandEmitter} — ${refs.length} opération${refs.length > 1 ? 's' : ''} indexée${refs.length > 1 ? 's' : ''}`,
    description: `Les opérations de ${first.brandEmitter} indexées par Argos sur ${unique(refs.map((r) => r.sector)).join(', ')}.`,
  };
}

export default async function BrandPage({ params }: BrandPageProps) {
  const { slug } = await params;
  const refs = await getReferencesByBrand(slug);
  if (refs.length === 0) notFound();

  const first = refs[0]!;
  const brandName = first.brandEmitter;
  const agencies = unique(refs.map((r) => r.agencyCreator).filter((a): a is string => Boolean(a)));
  const markets = unique(refs.flatMap((r) => [r.marketPrimary, ...r.marketsSecondary]));
  const sectors = unique(refs.map((r) => r.sector));
  const years = refs.map((r) => r.emissionYear).sort((a, b) => a - b);
  const yearsFirst = years[0] ?? 0;
  const yearsLast = years[years.length - 1] ?? 0;
  const totalAssets = refs.reduce((sum, r) => sum + r.assets.length, 0);
  const totalMetrics = refs.reduce((sum, r) => sum + r.performance.metrics.length, 0);

  return (
    <EntityPageShell
      eyebrow="Marque"
      name={brandName}
      description={
        sectors.length === 1
          ? `Opérations attribuées à ${brandName}, sur le secteur ${sectors[0]}.`
          : `Opérations attribuées à ${brandName}, à travers ${sectors.length} secteurs : ${sectors.join(', ')}.`
      }
      stats={[
        { label: 'Opérations indexées', value: refs.length },
        { label: 'Assets dans les bundles', value: totalAssets },
        { label: 'Métriques de performance', value: totalMetrics },
        {
          label: 'Période active',
          value: yearsFirst === yearsLast ? `${yearsFirst}` : `${yearsFirst}–${yearsLast}`,
        },
      ]}
      references={refs}
      sidePanels={[
        {
          title: 'Agences créatrices',
          tags: agencies.map((a) => ({ label: a, href: `/agency/${slugify(a)}` })),
        },
        {
          title: 'Marchés touchés',
          tags: markets.map((m) => ({ label: m, href: `/market/${slugify(m)}` })),
        },
      ]}
    />
  );
}

function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}
