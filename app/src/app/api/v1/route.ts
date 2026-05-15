// GET /api/v1 — API root. Returns a self-describing index of available endpoints.

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    name: 'Argos REST API',
    version: 'v1',
    description:
      'Programmatic access to the Argos library of qualified marketing campaign references.',
    endpoints: {
      references: '/api/v1/references',
      referenceBySlug: '/api/v1/references/{slug}',
      sectors: '/api/v1/sectors',
      brands: '/api/v1/brands',
      brandBySlug: '/api/v1/brands/{slug}',
      agencies: '/api/v1/agencies',
      agencyBySlug: '/api/v1/agencies/{slug}',
      markets: '/api/v1/markets',
      marketBySlug: '/api/v1/markets/{slug}',
      years: '/api/v1/years',
      yearByValue: '/api/v1/years/{year}',
      awards: '/api/v1/awards',
      awardBySlug: '/api/v1/awards/{slug}',
      assets: '/api/v1/assets',
      assetFunctions: '/api/v1/asset-functions',
      ingestDossier: 'POST /api/v1/ingest/dossier',
    },
    docs: '/about',
    schemaVersion: 'research-dossier-v1',
  });
}
