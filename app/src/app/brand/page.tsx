import type { Metadata } from 'next';
import { EntityIndexShell } from '@/components/entity-index-shell';
import { listBrands } from '@/lib/library';

export const metadata: Metadata = {
  title: 'Toutes les marques — Argos',
  description: 'Index complet des marques dont les opérations sont documentées dans Argos.',
};

export default async function BrandsIndexPage() {
  const brands = await listBrands();
  return (
    <EntityIndexShell
      eyebrow="Marques"
      title={{ head: 'Toutes les', tail: 'marques.' }}
      description="Chaque marque ouvre sur ses opérations indexées, ses agences créatrices et ses marchés."
      baseHref="/brand"
      items={brands.map((b) => ({
        slug: b.slug,
        label: b.value,
        count: b.count,
        sublabel: `${b.count} opération${b.count > 1 ? 's' : ''} indexée${b.count > 1 ? 's' : ''}`,
      }))}
    />
  );
}
