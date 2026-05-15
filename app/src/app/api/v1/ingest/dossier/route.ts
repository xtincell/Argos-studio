// POST /api/v1/ingest/dossier
//
// Accepts a JSON body conforming to research-dossier-v1, validates it,
// and writes the resulting Reference + Asset + axes + metrics + sources
// into the database. Idempotent on the generated slug (resubmissions amend).

import { NextResponse, type NextRequest } from 'next/server';
import { ResearchDossierSchema } from '@/lib/research-dossier';
import { ingestDossier } from '@/server/ingest';

export async function POST(request: NextRequest) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: 'INVALID_JSON',
        message: err instanceof Error ? err.message : 'Could not parse JSON body',
      },
      { status: 400 },
    );
  }

  const parseResult = ResearchDossierSchema.safeParse(raw);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        ok: false,
        error: 'INVALID_DOSSIER',
        issues: parseResult.error.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      },
      { status: 422 },
    );
  }

  try {
    const { result, newlyCreated } = await ingestDossier(parseResult.data);
    return NextResponse.json(
      {
        ok: true,
        slug: result.reference.slug,
        assetCount: result.reference.assets.length,
        newlyCreated,
        audit: result.audit,
      },
      { status: newlyCreated ? 201 : 200 },
    );
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: 'STORE_FAILED',
        message: err instanceof Error ? err.message : 'Could not persist reference',
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json(
    {
      endpoint: '/api/v1/ingest/dossier',
      method: 'POST',
      schemaVersion: 'research-dossier-v1',
      docs: '/docs/research-dossier-spec',
      template: '/dossier-template.json',
      example: '/dossier-example.json',
    },
    { status: 200 },
  );
}
