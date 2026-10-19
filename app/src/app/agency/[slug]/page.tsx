import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { EntityPageShell } from '@/components/entity-page-shell';
import { getReferencesByAgency, slugify } from '@/lib/library';

// Canonical library data changes after admission; never freeze its identities at build time.
export const dynamic = 'force-dynamic';

interface AgencyPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: AgencyPageProps): Promise<Metadata> {
  const { slug } = await params;
  const refs = await getReferencesByAgency(slug);
  if (refs.length === 0) return { title: 'Agence introuvable' };
  const agencyName = refs[0]?.agencyCreator ?? slug;
  return {
    title: `${agencyName} — œuvre indexée`,
    description: `Opérations attribuées à ${agencyName}.`,
  };
}

export default async function AgencyPage({ params }: AgencyPageProps) {
  const { slug } = await params;
  const refs = await getReferencesByAgency(slug);
  if (refs.length === 0) notFound();

  const agencyName = refs[0]?.agencyCreator ?? slug;
  const brands = Array.from(new Set(refs.map((r) => r.brandEmitter)));
  const sectors = Array.from(new Set(refs.map((r) => r.sector)));
  const years = refs.map((r) => r.emissionYear).sort((a, b) => a - b);

  return (
    <EntityPageShell
      eyebrow="Agence"
      name={agencyName}
      description={`Œuvre de ${agencyName} indexée par Argos : ${refs.length} opération${refs.length > 1 ? 's' : ''} pour ${brands.length} marque${brands.length > 1 ? 's' : ''}.`}
      stats={[
        { label: 'Opérations', value: refs.length },
        { label: 'Marques servies', value: brands.length },
        { label: 'Secteurs', value: sectors.length },
        {
          label: 'Période',
          value:
            years.length > 0
              ? years[0] === years[years.length - 1]
                ? `${years[0]}`
                : `${years[0]}–${years[years.length - 1]}`
              : '—',
        },
      ]}
      references={refs}
      sidePanels={[
        {
          title: 'Marques au portefeuille',
          tags: brands.map((b) => ({ label: b, href: `/brand/${slugify(b)}` })),
        },
        {
          title: 'Secteurs couverts',
          tags: sectors.map((s) => ({ label: s, href: `/sector/${slugify(s)}` })),
        },
      ]}
    />
  );
}
