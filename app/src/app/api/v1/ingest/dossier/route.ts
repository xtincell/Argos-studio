// POST /api/v1/ingest/dossier
//
// Accepts a JSON body conforming to research-dossier-v1, validates it,
// and writes the resulting Reference + Asset + axes + metrics + sources
// into the database. Idempotent on the generated slug (resubmissions amend).
// `?visibility=private` admits a new dossier in the private space (ADR-0010); without it a new
// dossier is public, and an amendment keeps the stored visibility.

import { Prisma } from '@prisma/client';
import { NextResponse, type NextRequest } from 'next/server';
import { ResearchDossierSchema } from '@/lib/research-dossier';
import { parseVisibility } from '@/lib/visibility';
import { requireAdmin } from '@/server/admin-access';
import { ingestDossier, IngestValidationError } from '@/server/ingest';

export async function POST(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  const requestedVisibility = request.nextUrl.searchParams.get('visibility');
  const visibility = requestedVisibility === null ? undefined : parseVisibility(requestedVisibility);
  if (visibility === null) {
    return NextResponse.json(
      { ok: false, error: 'INVALID_VISIBILITY', message: 'La visibilité doit être « public » ou « private ».' },
      { status: 422 },
    );
  }
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
    const record = await ingestDossier(parseResult.data, expected, { visibility });
    const { result, newlyCreated, updatedAt } = record;
    return NextResponse.json(
      {
        ok: true,
        slug: result.reference.slug,
        assetCount: result.reference.assets.length,
        newlyCreated,
        updatedAt,
        visibility: record.visibility,
        audit: result.audit,
      },
      { status: newlyCreated ? 201 : 200 },
    );
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && ['P2002', 'P2034'].includes(err.code)) return NextResponse.json({ ok: false, error: 'VERSION_CONFLICT', message: 'La référence a changé pendant l’enregistrement. Rechargez-la avant de modifier.' }, { status: 409 });
    if (err instanceof IngestValidationError) {
      return NextResponse.json(
        { ok: false, error: err.code, message: err.message },
        { status: err.code === 'VERSION_CONFLICT' || err.code === 'VISIBILITY_CONFLICT' ? 409 : 422 },
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
      authentication: 'Authorization: Bearer <ARGOS_ADMIN_KEY>, or an administration session opened at /admin/login',
      concurrency: 'Amending an existing reference requires If-Match with its current version (ETag of ?format=dossier); a stale version receives 409.',
      visibility: '?visibility=private admits a new dossier in the private space, read with the administration key only and purged 24 months after its last modification unless published; without it a new dossier is public. An amendment keeps the stored visibility; change it with POST /api/v1/references/{slug}/visibility.',
      docs: '/docs/research-dossier-spec',
      template: '/dossier-template.json',
      example: '/dossier-example.json',
    },
    { status: 200 },
  );
}
