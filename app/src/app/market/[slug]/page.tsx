import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { EntityPageShell } from '@/components/entity-page-shell';
import { getReferencesByMarket, listMarkets, slugify } from '@/lib/library';

interface MarketPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return (await listMarkets()).map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({ params }: MarketPageProps): Promise<Metadata> {
  const { slug } = await params;
  const refs = await getReferencesByMarket(slug);
  if (refs.length === 0) return { title: 'Marché introuvable' };
  const marketName = displayName(refs[0]?.marketPrimary, refs, slug);
  return {
    title: `${marketName} — opérations indexées`,
    description: `Opérations marketing indexées sur le marché ${marketName}.`,
  };
}

export default async function MarketPage({ params }: MarketPageProps) {
  const { slug } = await params;
  const refs = await getReferencesByMarket(slug);
  if (refs.length === 0) notFound();

  const marketName = displayName(refs[0]?.marketPrimary, refs, slug);
  const sectors = Array.from(new Set(refs.map((r) => r.sector)));
  const brands = Array.from(new Set(refs.map((r) => r.brandEmitter)));

  return (
    <EntityPageShell
      eyebrow="Marché"
      name={marketName}
      description={`Opérations actives sur ${marketName}, ${refs.length} indexée${refs.length > 1 ? 's' : ''} sur ${sectors.length} secteur${sectors.length > 1 ? 's' : ''}.`}
      stats={[
        { label: 'Opérations', value: refs.length },
        { label: 'Marques', value: brands.length },
        { label: 'Secteurs', value: sectors.length },
      ]}
      references={refs}
      sidePanels={[
        {
          title: 'Secteurs sur ce marché',
          tags: sectors.map((s) => ({ label: s, href: `/sector/${slugify(s)}` })),
        },
        {
          title: 'Marques sur ce marché',
          tags: brands.map((b) => ({ label: b, href: `/brand/${slugify(b)}` })),
        },
      ]}
    />
  );
}

function displayName(
  primary: string | undefined,
  refs: { marketPrimary: string; marketsSecondary: string[] }[],
  slug: string,
): string {
  for (const r of refs) {
    if (slugify(r.marketPrimary) === slug) return r.marketPrimary;
    const sec = r.marketsSecondary.find((m) => slugify(m) === slug);
    if (sec) return sec;
  }
  return primary ?? slug;
}
