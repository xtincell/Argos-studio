import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { EntityPageShell } from '@/components/entity-page-shell';
import { getReferencesBySector, getSectorMeta, listSectors, slugify } from '@/lib/library';

interface SectorPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return (await listSectors()).map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: SectorPageProps): Promise<Metadata> {
  const { slug } = await params;
  const refs = await getReferencesBySector(slug);
  if (refs.length === 0) return { title: 'Secteur introuvable' };
  const meta = getSectorMeta(slug);
  const name = meta?.name ?? refs[0]?.sector ?? slug;
  return {
    title: `${name} — patterns et opérations`,
    description: meta?.description ?? `Opérations marketing indexées dans le secteur ${name}.`,
  };
}

export default async function SectorPage({ params }: SectorPageProps) {
  const { slug } = await params;
  const refs = await getReferencesBySector(slug);
  if (refs.length === 0) notFound();
  const meta = getSectorMeta(slug);
  const name = meta?.name ?? refs[0]?.sector ?? slug;
  const brands = Array.from(new Set(refs.map((r) => r.brandEmitter)));
  const agencies = Array.from(
    new Set(refs.map((r) => r.agencyCreator).filter((a): a is string => Boolean(a))),
  );

  return (
    <EntityPageShell
      eyebrow="Secteur"
      name={name}
      description={
        meta?.description ?? `Opérations marketing indexées dans le secteur ${name}.`
      }
      stats={[
        { label: 'Opérations indexées', value: refs.length },
        { label: 'Marques présentes', value: brands.length },
        { label: 'Agences créatrices', value: agencies.length },
        {
          label: 'Patterns émergents',
          value: meta?.emergingPatterns.length ?? 0,
        },
      ]}
      references={refs}
      sidePanels={[
        {
          title: 'Marques présentes',
          tags: brands.map((b) => ({ label: b, href: `/brand/${slugify(b)}` })),
        },
        ...(meta && meta.topBrands.length > 0
          ? [
              {
                title: 'Marques de référence (méta)',
                tags: meta.topBrands.map((b) => ({ label: b })),
              },
            ]
          : []),
      ]}
      extraSection={
        meta && meta.emergingPatterns.length > 0 ? (
          <section
            style={{
              marginTop: 32,
              background: 'var(--paper)',
              border: '1px solid var(--line)',
              borderRadius: 22,
              padding: 24,
            }}
          >
            <h2
              style={{
                margin: 0,
                marginBottom: 14,
                fontSize: 22,
                letterSpacing: '-0.015em',
                fontWeight: 600,
              }}
            >
              Patterns <span className="serif">émergents.</span>
            </h2>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8 }}>
              {meta.emergingPatterns.map((p) => (
                <li
                  key={p}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 14px',
                    background: 'var(--bg-2)',
                    border: '1px solid var(--line-soft)',
                    borderRadius: 14,
                    fontSize: 14,
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: 'var(--coral)',
                      flexShrink: 0,
                    }}
                  />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null
      }
    />
  );
}
