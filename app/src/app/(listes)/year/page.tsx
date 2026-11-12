import type { Metadata } from 'next';
import { EntityIndexShell } from '@/components/entity-index-shell';
import { listYears } from '@/lib/library';
import { pageReadScope } from '@/server/read-scope';

export const metadata: Metadata = {
  title: 'Chronologie — Argos',
  description: 'Toutes les années d\'émission représentées dans la bibliothèque Argos.',
};

export default async function YearsIndexPage() {
  const scope = await pageReadScope();
  const years = await listYears(scope);
  return (
    <EntityIndexShell
      eyebrow="Chronologie"
      title={{ head: 'Toutes les', tail: 'années.' }}
      description="Chaque année ouvre sur les opérations émises pendant cette période."
      baseHref="/year"
      items={years
        .slice()
        .sort((a, b) => b.value - a.value)
        .map((y) => ({
          slug: String(y.value),
          label: String(y.value),
          count: y.count,
          sublabel: `${y.count} opération${y.count > 1 ? 's' : ''}`,
        }))}
    />
  );
}
