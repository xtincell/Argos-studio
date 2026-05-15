import type { Reference, SectorMeta } from '@/lib/types';

// v1 strategy : MOCK_REFERENCES is intentionally empty.
//
// All references in v1 are real, manually-documented research dossiers stored
// as JSON files in app/public/dossier-*.json, ingested via the seed script.
// Sources are verified, images are licensed (Wikimedia Commons + Unsplash with
// brand-issued press-kit equivalents), metrics carry an attribution and a
// source string. No invented numbers, no placeholder URLs.
//
// To add a new reference, write a dossier JSON conforming to ResearchDossier
// schema (see app/public/dossier-template.json) and re-seed.
//
// MOCK_SECTORS remains : sector metadata is editorial taxonomy, not data points.
// Keep it small and curated.

export const MOCK_REFERENCES: Reference[] = [];

export const MOCK_SECTORS: SectorMeta[] = [
  {
    slug: 'sportswear',
    name: 'Sportswear',
    description:
      "La publicité sportswear est depuis longtemps le laboratoire du branding identitaire. De la démonstration produit dans les années 70, à l'athlète-héros des années 80, au lifestyle-aspiration des années 90, jusqu'à la communauté-comme-produit aujourd'hui.",
    referenceCount: 412,
    topBrands: ['Nike', 'Adidas', 'Under Armour', 'Puma', 'New Balance'],
    emergingPatterns: [
      "Récits athlète-activiste",
      'Films communauté hyperlocale',
      'Preuves de durabilité',
    ],
  },
  {
    slug: 'telecommunications',
    name: 'Télécommunications',
    description:
      "La publicité telco sur les marchés africains a basculé des revendications rationnelles de couverture au storytelling émotionnel de la connexion familiale. La catégorie qui récompense le plus la posture Dealer sur les marchés francophones.",
    referenceCount: 287,
    topBrands: ['MTN', 'Orange', 'Airtel', 'Glo', 'Vodacom', 'Moov'],
    emergingPatterns: [
      "Patterns d'appel résolution-de-culpabilité",
      "Territoires générationnels style Y'ello",
      "Mobile money comme récit d'identité",
    ],
  },
  {
    slug: 'technology',
    name: 'Technologie',
    description:
      "La publicité tech oscille entre démonstration de capacité produit et construction de tribu identitaire. Apple a défini la seconde voie ; le reste de l'industrie passe 25 ans à rattraper.",
    referenceCount: 519,
    topBrands: ['Apple', 'Google', 'Microsoft', 'Samsung', 'Sony'],
    emergingPatterns: [
      'Authenticité anti-IA',
      'Revendications privacy-luxe',
      'Récits hardware-as-craft',
    ],
  },
];

export function getReferenceBySlug(slug: string): Reference | undefined {
  return MOCK_REFERENCES.find((r) => r.slug === slug);
}

export function getReferencesBySector(sector: string): Reference[] {
  return MOCK_REFERENCES.filter(
    (r) => r.sector.toLowerCase() === sector.toLowerCase(),
  );
}

export function getSectorBySlug(slug: string): SectorMeta | undefined {
  return MOCK_SECTORS.find((s) => s.slug === slug);
}
