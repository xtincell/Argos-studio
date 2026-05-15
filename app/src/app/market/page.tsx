import type { Metadata } from 'next';
import { EntityIndexShell } from '@/components/entity-index-shell';
import { listMarkets } from '@/lib/library';

export const metadata: Metadata = {
  title: 'Tous les marchés — Argos',
  description: 'Index des marchés couverts par les opérations Argos.',
};

export default async function MarketsIndexPage() {
  const markets = await listMarkets();
  return (
    <EntityIndexShell
      eyebrow="Marchés"
      title={{ head: 'Tous les', tail: 'marchés.' }}
      description="Chaque marché ouvre sur les opérations actives sur son territoire, leurs marques et leurs secteurs."
      baseHref="/market"
      items={markets.map((m) => ({
        slug: m.slug,
        label: m.value,
        count: m.count,
        sublabel: `${m.count} opération${m.count > 1 ? 's' : ''}`,
      }))}
    />
  );
}
