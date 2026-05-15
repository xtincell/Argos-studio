import type { MetadataRoute } from 'next';
import {
  getAllAssets,
  getAllReferences,
  listAgencies,
  listAwards,
  listBrands,
  listMarkets,
  listSectors,
  listYears,
} from '@/lib/library';

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [refs, assets, brands, sectors, agencies, markets, years, awards] = await Promise.all([
    getAllReferences(),
    getAllAssets(),
    listBrands(),
    listSectors(),
    listAgencies(),
    listMarkets(),
    listYears(),
    listAwards(),
  ]);

  const staticRoutes = [
    '/',
    '/works',
    '/assets',
    '/patterns',
    '/search',
    '/about',
    '/glossary',
    '/admin/ingest',
    '/docs/research-dossier-spec',
    '/docs/api',
    '/sign-in',
    '/terms',
    '/privacy',
    '/brand',
    '/sector',
    '/agency',
    '/market',
    '/year',
    '/award',
  ];

  const now = new Date();
  const entries: MetadataRoute.Sitemap = [
    ...staticRoutes.map((path) => ({
      url: `${SITE}${path}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: path === '/' ? 1 : 0.7,
    })),
    ...refs.flatMap((r) => [
      {
        url: `${SITE}/work/${r.slug}`,
        lastModified: now,
        changeFrequency: 'monthly' as const,
        priority: 0.8,
      },
      {
        url: `${SITE}/work/${r.slug}/inspect`,
        lastModified: now,
        changeFrequency: 'monthly' as const,
        priority: 0.5,
      },
    ]),
    ...assets.map((a) => ({
      url: `${SITE}/asset/${a.asset.id}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    })),
    ...brands.map((b) => ({
      url: `${SITE}/brand/${b.slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
    ...sectors.map((s) => ({
      url: `${SITE}/sector/${s.slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
    ...agencies.map((a) => ({
      url: `${SITE}/agency/${a.slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    })),
    ...markets.map((m) => ({
      url: `${SITE}/market/${m.slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    })),
    ...years.map((y) => ({
      url: `${SITE}/year/${y.value}`,
      lastModified: now,
      changeFrequency: 'yearly' as const,
      priority: 0.4,
    })),
    ...awards.map((a) => ({
      url: `${SITE}/award/${a.slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.4,
    })),
  ];

  return entries;
}
