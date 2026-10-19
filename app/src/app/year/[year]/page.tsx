import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { EntityPageShell } from '@/components/entity-page-shell';
import { getReferencesByYear, slugify } from '@/lib/library';

// Canonical library data changes after admission; never freeze its identities at build time.
export const dynamic = 'force-dynamic';

interface YearPageProps {
  params: Promise<{ year: string }>;
}

export async function generateMetadata({ params }: YearPageProps): Promise<Metadata> {
  const { year } = await params;
  return {
    title: `${year} — opérations indexées`,
    description: `Opérations marketing émises en ${year} et indexées par Argos.`,
  };
}

export default async function YearPage({ params }: YearPageProps) {
  const { year } = await params;
  const yearNum = Number.parseInt(year, 10);
  if (!Number.isFinite(yearNum)) notFound();
  const refs = await getReferencesByYear(yearNum);
  if (refs.length === 0) notFound();

  const sectors = Array.from(new Set(refs.map((r) => r.sector)));
  const brands = Array.from(new Set(refs.map((r) => r.brandEmitter)));
  const agencies = Array.from(
    new Set(refs.map((r) => r.agencyCreator).filter((a): a is string => Boolean(a))),
  );

  return (
    <EntityPageShell
      eyebrow="Année"
      name={year}
      description={`Opérations émises en ${year}, indexées par Argos.`}
      stats={[
        { label: 'Opérations', value: refs.length },
        { label: 'Marques', value: brands.length },
        { label: 'Secteurs', value: sectors.length },
        { label: 'Agences', value: agencies.length },
      ]}
      references={refs}
      sidePanels={[
        {
          title: 'Marques',
          tags: brands.map((b) => ({ label: b, href: `/brand/${slugify(b)}` })),
        },
        {
          title: 'Secteurs',
          tags: sectors.map((s) => ({ label: s, href: `/sector/${slugify(s)}` })),
        },
      ]}
    />
  );
}
