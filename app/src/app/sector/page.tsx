import type { Metadata } from 'next';
import { EntityIndexShell } from '@/components/entity-index-shell';
import { listSectors } from '@/lib/library';

export const metadata: Metadata = {
  title: 'Tous les secteurs — Argos',
  description: 'Index des secteurs représentés dans la bibliothèque Argos.',
};

export default async function SectorsIndexPage() {
  const sectors = await listSectors();
  return (
    <EntityIndexShell
      eyebrow="Secteurs"
      title={{ head: 'Tous les', tail: 'secteurs.' }}
      description="Chaque secteur regroupe les opérations marketing qui y opèrent, avec les patterns émergents documentés."
      baseHref="/sector"
      items={sectors.map((s) => ({
        slug: s.slug,
        label: s.value,
        count: s.count,
        sublabel: `${s.count} opération${s.count > 1 ? 's' : ''}`,
      }))}
    />
  );
}
