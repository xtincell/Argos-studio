import { getHeroAsset, type Reference } from './types';

/**
 * Schema.org Article for a reference page — gives search engines and link previews context.
 * Dates are the stored ones: datePublished is the documented research date when present,
 * dateModified the version of the canonical reference. Neither is ever filled with "today"
 * or a guessed day of the emission year.
 */
export function buildArticleJsonLd(reference: Reference, site = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://argos.studio') {
  const url = `${site}/work/${reference.slug}`;
  const heroAsset = getHeroAsset(reference);
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `${reference.title} — ${reference.brandEmitter}`,
    description: reference.summary,
    url,
    mainEntityOfPage: url,
    inLanguage: 'fr',
    isAccessibleForFree: true,
    image: heroAsset?.url || `${site}/work/${reference.slug}/opengraph-image`,
    author: reference.researcherName
      ? { '@type': 'Person', name: reference.researcherName }
      : { '@type': 'Organization', name: 'Argos' },
    publisher: {
      '@type': 'Organization',
      name: 'Argos',
      url: site,
    },
    ...(reference.researchDate ? { datePublished: reference.researchDate } : {}),
    ...(reference.updatedAt ? { dateModified: reference.updatedAt } : {}),
    about: [
      { '@type': 'Brand', name: reference.brandEmitter },
      { '@type': 'Thing', name: reference.sector },
      ...(reference.agencyCreator
        ? [{ '@type': 'Organization', name: reference.agencyCreator }]
        : []),
    ],
    keywords: [
      reference.brandEmitter,
      reference.sector,
      reference.patternKind,
      reference.manipulationMode,
      ...reference.victoryTypes,
      ...reference.operationGoals,
    ].join(', '),
    citation: (reference.researchSources ?? []).slice(0, 12).map((s) => ({
      '@type': 'CreativeWork',
      name: s.title,
      url: s.url,
      publisher: s.publisher ? { '@type': 'Organization', name: s.publisher } : undefined,
      datePublished: s.publishedDate,
    })),
  };
}
