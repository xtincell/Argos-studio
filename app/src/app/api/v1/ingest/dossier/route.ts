// POST /api/v1/ingest/dossier
//
// Accepts a JSON body conforming to research-dossier-v1, validates it,
// and writes the resulting Reference + Asset + axes + metrics + sources
// into the database. Idempotent on the generated slug (resubmissions amend).

import { Prisma } from '@prisma/client';
import { NextResponse, type NextRequest } from 'next/server';
import { ResearchDossierSchema } from '@/lib/research-dossier';
import { requireIngestAccess } from '@/server/ingest-access';
import { ingestDossier, IngestValidationError } from '@/server/ingest';

export async function POST(request: NextRequest) {
  const denied = requireIngestAccess(request);
  if (denied) return denied;
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
    const expected = request.headers.get("if-match")?.replace(/^"|"$/g, "");
    const { result, newlyCreated, updatedAt } = await ingestDossier(parseResult.data, expected);
    return NextResponse.json(
      {
        ok: true,
        slug: result.reference.slug,
        assetCount: result.reference.assets.length,
        newlyCreated,
        updatedAt,
        audit: result.audit,
      },
      { status: newlyCreated ? 201 : 200 },
    );
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && ['P2002', 'P2034'].includes(err.code)) return NextResponse.json({ ok: false, error: 'VERSION_CONFLICT', message: 'La référence a changé pendant l’enregistrement. Rechargez-la avant de modifier.' }, { status: 409 });
    if (err instanceof IngestValidationError) {
      return NextResponse.json(
        { ok: false, error: err.code, message: err.message },
        { status: err.code === "VERSION_CONFLICT" ? 409 : 422 },
      );
    }
    return NextResponse.json(
      {
        ok: false,
        error: 'STORE_FAILED',
        message: 'Could not persist reference. No partial dossier was saved.',
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
