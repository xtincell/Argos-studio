// POST /api/v1/references/{slug}/visibility — publish a private dossier or withdraw a public one
// into the private space (ADR-0010). Administration key only, checked before anything is read:
// without it, nothing is said about the dossier, not even whether it exists.
//
// JSON client: { "visibility": "public" | "private" }, optional If-Match with the version (ETag of
// ?format=dossier). Browser form (session): fields `visibility` and `version`, answered by a 303
// back to the dossier page with the outcome in `?visibilite=`.

import { NextResponse, type NextRequest } from 'next/server';
import { parseVisibility } from '@/lib/visibility';
import { adminChannel, requireAdmin } from '@/server/admin-access';
import { VisibilityError, changeVisibility } from '@/server/visibility';

const MAX_BODY_BYTES = 4096;
/** Outcome wording read by the dossier page (`?visibilite=`). */
const FORM_OUTCOME: Record<string, string> = {
  public: 'publique', private: 'privee', unchanged: 'inchangee',
  PUBLICATION_REFUSED: 'refusee', VERSION_CONFLICT: 'conflit', INVALID_VISIBILITY: 'invalide', INVALID_BODY: 'invalide',
};

function noStore(response: NextResponse) {
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  const { slug } = await params;
  const isForm = (request.headers.get('content-type') ?? '').includes('application/x-www-form-urlencoded');
  const page = `/work/${encodeURIComponent(slug)}`;
  const answer = (status: number, body: Record<string, unknown>, outcome: string) => noStore(isForm
    ? new NextResponse(null, { status: 303, headers: { Location: `${page}?visibilite=${outcome}` } })
    : NextResponse.json(body, { status }));

  let requested: unknown;
  let version: string | undefined = request.headers.get('if-match')?.replace(/^"|"$/g, '') || undefined;
  try {
    if (Number(request.headers.get('content-length') ?? '0') > MAX_BODY_BYTES) throw new Error('too large');
    const text = await request.text();
    if (text.length > MAX_BODY_BYTES) throw new Error('too large');
    if (isForm) {
      const form = new URLSearchParams(text);
      requested = form.get('visibility');
      version = form.get('version') || version;
    } else {
      requested = (JSON.parse(text) as { visibility?: unknown }).visibility;
    }
  } catch {
    return answer(400, { ok: false, error: 'INVALID_BODY', message: 'Demande illisible.' }, FORM_OUTCOME.INVALID_BODY ?? 'invalide');
  }
  const visibility = parseVisibility(requested);
  if (!visibility) {
    return answer(422, { ok: false, error: 'INVALID_VISIBILITY', message: 'La visibilité doit être « public » ou « private ».' },
      FORM_OUTCOME.INVALID_VISIBILITY ?? 'invalide');
  }
  try {
    const receipt = await changeVisibility({ slug, visibility, channel: adminChannel(request), expectedUpdatedAt: version });
    return answer(200, { ok: true, ...receipt }, (receipt.changed ? FORM_OUTCOME[receipt.visibility] : FORM_OUTCOME.unchanged) ?? 'inchangee');
  } catch (error) {
    if (!(error instanceof VisibilityError)) throw error;
    if (error.code === 'NOT_FOUND') {
      return noStore(NextResponse.json({ ok: false, error: 'NOT_FOUND', message: error.message }, { status: 404 }));
    }
    return answer(409, { ok: false, error: error.code, message: error.message, issues: error.issues },
      FORM_OUTCOME[error.code] ?? 'conflit');
  }
}
