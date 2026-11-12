// POST /api/admin/private-purge — retention purge of the private space (ADR-0010).
// Administration key only. The mode is explicit and required:
//   { "mode": "dry-run" } lists the private dossiers due for purge and writes nothing;
//   { "mode": "purge" }   deletes them and logs the run (counts only).
// A browser form (session, field `mode`) is answered by a 303 back to /admin/prive.
// The `argos-purge-private` command of the image calls this route with the key.

import { NextResponse, type NextRequest } from 'next/server';
import { adminChannel, requireAdmin } from '@/server/admin-access';
import { type PurgeMode, purgeExpiredPrivateDossiers } from '@/server/private-retention';

const MAX_BODY_BYTES = 4096;

function parseMode(value: unknown): PurgeMode | null {
  return value === 'dry-run' || value === 'purge' ? value : null;
}

export async function POST(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  const isForm = (request.headers.get('content-type') ?? '').includes('application/x-www-form-urlencoded');
  let mode: PurgeMode | null = null;
  try {
    if (Number(request.headers.get('content-length') ?? '0') > MAX_BODY_BYTES) throw new Error('too large');
    const text = await request.text();
    if (text.length > MAX_BODY_BYTES) throw new Error('too large');
    mode = isForm
      ? parseMode(new URLSearchParams(text).get('mode'))
      : parseMode(text.trim() ? (JSON.parse(text) as { mode?: unknown }).mode : undefined);
  } catch {
    mode = null;
  }
  if (!mode) {
    if (isForm) return redirect('/admin/prive?purge=invalide');
    return NextResponse.json(
      { ok: false, error: 'MODE_REQUIRED', message: 'Précisez le mode : « dry-run » (aperçu sans écriture) ou « purge ».' },
      { status: 422, headers: { 'Cache-Control': 'no-store' } },
    );
  }
  const report = await purgeExpiredPrivateDossiers({ mode, trigger: adminChannel(request) });
  if (isForm) {
    return redirect(mode === 'purge' ? `/admin/prive?purge=${report.purgedCount}` : '/admin/prive');
  }
  return NextResponse.json({ ok: true, ...report }, { headers: { 'Cache-Control': 'no-store' } });
}

function redirect(location: string) {
  return new NextResponse(null, { status: 303, headers: { Location: location, 'Cache-Control': 'no-store' } });
}
