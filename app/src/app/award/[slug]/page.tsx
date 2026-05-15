import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { EntityPageShell } from '@/components/entity-page-shell';
import { VICTORY_LABELS } from '@/lib/taxonomy';
import { getReferencesByAward, listAwards, slugify } from '@/lib/library';
import type { VictoryType } from '@/lib/types';

interface AwardPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return (await listAwards()).map((a) => ({ slug: a.slug }));
}

function findAward(slug: string): VictoryType | undefined {
  const all = Object.keys(VICTORY_LABELS) as VictoryType[];
  return all.find((v) => slugify(v) === slug);
}

export async function generateMetadata({ params }: AwardPageProps): Promise<Metadata> {
  const { slug } = await params;
  const award = findAward(slug);
  if (!award) return { title: 'Victoire introuvable' };
  return {
    title: `${VICTORY_LABELS[award]} — opérations primées`,
    description: `Opérations reconnues par ${VICTORY_LABELS[award]}.`,
  };
}

export default async function AwardPage({ params }: AwardPageProps) {
  const { slug } = await params;
  const award = findAward(slug);
  if (!award) notFound();
  const refs = await getReferencesByAward(award);
  if (refs.length === 0) notFound();

  const brands = Array.from(new Set(refs.map((r) => r.brandEmitter)));
  const years = refs.map((r) => r.emissionYear).sort((a, b) => a - b);

  return (
    <EntityPageShell
      eyebrow="Victoire documentée"
      name={VICTORY_LABELS[award]}
      description={`Opérations reconnues par ${VICTORY_LABELS[award]} dans Argos.`}
      stats={[
        { label: 'Opérations primées', value: refs.length },
        { label: 'Marques', value: brands.length },
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
          title: 'Marques primées',
          tags: brands.map((b) => ({ label: b, href: `/brand/${slugify(b)}` })),
        },
      ]}
    />
  );
}
