import type { Metadata } from 'next';
import { EntityIndexShell } from '@/components/entity-index-shell';
import { listAwards } from '@/lib/library';
import { VICTORY_LABELS } from '@/lib/taxonomy';

export const metadata: Metadata = {
  title: 'Victoires documentées — Argos',
  description: 'Toutes les preuves de réussite (awards, longévité, statut culte) référencées dans Argos.',
};

export default async function AwardsIndexPage() {
  const awards = await listAwards();
  return (
    <EntityIndexShell
      eyebrow="Victoires"
      title={{ head: 'Toutes les', tail: 'victoires.' }}
      description="14 types de preuves de réussite — awards officiels, longévité, statut culte, impact commercial prouvé, imitation par la concurrence."
      baseHref="/award"
      items={awards.map((a) => ({
        slug: a.slug,
        label: VICTORY_LABELS[a.value] ?? a.value,
        count: a.count,
        sublabel: `${a.count} opération${a.count > 1 ? 's' : ''} reconnue${a.count > 1 ? 's' : ''}`,
      }))}
    />
  );
}
