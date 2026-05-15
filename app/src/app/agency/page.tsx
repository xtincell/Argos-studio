import type { Metadata } from 'next';
import { EntityIndexShell } from '@/components/entity-index-shell';
import { listAgencies } from '@/lib/library';

export const metadata: Metadata = {
  title: 'Toutes les agences — Argos',
  description: 'Index des agences créatrices créditées sur les opérations Argos.',
};

export default async function AgenciesIndexPage() {
  const agencies = await listAgencies();
  return (
    <EntityIndexShell
      eyebrow="Agences"
      title={{ head: 'Toutes les', tail: 'agences.' }}
      description="Chaque agence ouvre sur son body of work : opérations créées, marques au portefeuille, période active."
      baseHref="/agency"
      items={agencies.map((a) => ({
        slug: a.slug,
        label: a.value,
        count: a.count,
        sublabel: `${a.count} opération${a.count > 1 ? 's' : ''}`,
      }))}
    />
  );
}
