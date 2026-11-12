// Single administration key of the library (arbitrage 5.8, 11 November 2026).
//
// `ARGOS_ADMIN_KEY` is read on the server only and never stored in the repository or the
// image. It authorises every write and every administration page or route, either:
//   - as `Authorization: Bearer <key>` (server clients such as La Fusée's projection), or
//   - through a browser session opened by the login form: an HttpOnly, Secure,
//     SameSite=Strict cookie signed with the key. Rotating the key ends every session.
// Without a configured key (or with a key shorter than 24 characters) administration is
// closed: writes answer 503 and administration pages send to the login page, which says so.
// Public reads of the library, API v1 included, never require this module; the same key widens
// a read to the private dossiers (src/server/read-scope.ts, ADR-0010).
//
// No account, provider or tenant is created here.

import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';

export const ADMIN_KEY_MIN_LENGTH = 24;
export const ADMIN_SESSION_COOKIE = 'argos_admin';
/** Lifetime of a browser session, in seconds (8 hours). */
export const ADMIN_SESSION_MAX_AGE = 8 * 60 * 60;
const SESSION_FORMAT = /^v1\.(\d{1,12})\.([A-Za-z0-9_-]{43})$/;
const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** The configured key, or null when administration is closed. */
export function configuredAdminKey(env: NodeJS.ProcessEnv = process.env): string | null {
  const key = env.ARGOS_ADMIN_KEY;
  return typeof key === 'string' && key.length >= ADMIN_KEY_MIN_LENGTH ? key : null;
}

/** The former variable name is ignored on purpose: one key, one variable. */
export function legacyKeyIgnored(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.ARGOS_INGEST_API_KEY) && !env.ARGOS_ADMIN_KEY;
}

const digest = (value: string) => createHash('sha256').update(value, 'utf8').digest();

/** Constant-time comparison: both sides are hashed to equal-length digests first. */
export function isAdminKey(supplied: string | null | undefined, configured: string): boolean {
  const candidate = typeof supplied === 'string' ? supplied : '';
  const equal = timingSafeEqual(digest(candidate), digest(configured));
  return equal && candidate.length > 0;
}

function sign(key: string, payload: string): string {
  return createHmac('sha256', key).update(`argos-admin-session:${payload}`).digest('base64url');
}

/** A session value `v1.<expiry seconds>.<HMAC>`; it carries no secret and no identity. */
export function createAdminSession(key: string, now = Date.now()): { value: string; expiresAt: Date } {
  const expiry = Math.floor(now / 1000) + ADMIN_SESSION_MAX_AGE;
  const payload = `v1.${expiry}`;
  return { value: `${payload}.${sign(key, payload)}`, expiresAt: new Date(expiry * 1000) };
}

export function verifyAdminSession(value: string | null | undefined, key: string, now = Date.now()): boolean {
  if (typeof value !== 'string') return false;
  const match = SESSION_FORMAT.exec(value);
  if (!match) return false;
  const expiry = Number(match[1]);
  const current = Math.floor(now / 1000);
  // Expired, or further than one lifetime ahead (never issued by this server).
  if (expiry <= current || expiry > current + ADMIN_SESSION_MAX_AGE) return false;
  const expected = Buffer.from(sign(key, `v1.${expiry}`));
  const supplied = Buffer.from(match[2] ?? '');
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

/** Cookie attributes of a session: never readable by scripts, never sent cross-site or over HTTP. */
export function sessionCookie(value: string, maxAge = ADMIN_SESSION_MAX_AGE) {
  return {
    name: ADMIN_SESSION_COOKIE,
    value,
    httpOnly: true,
    secure: true,
    sameSite: 'strict' as const,
    path: '/',
    maxAge,
  };
}

export function clearedSessionCookie() {
  return sessionCookie('', 0);
}

/**
 * Where the request says it comes from. `absent`: no Origin header (server clients such as
 * Node fetch); `same`: this library; `foreign`: any other origin, including `null`.
 * The host is compared, as the proxy terminates TLS before the application.
 */
export function requestOrigin(request: NextRequest): 'absent' | 'same' | 'foreign' {
  const origin = request.headers.get('origin');
  if (origin === null) return 'absent';
  let host: string;
  try {
    host = new URL(origin).host.toLowerCase();
  } catch {
    return 'foreign';
  }
  const allowed = new Set<string>([request.nextUrl.host.toLowerCase()]);
  const forwarded = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  if (forwarded) allowed.add(forwarded.toLowerCase());
  const direct = request.headers.get('host');
  if (direct) allowed.add(direct.toLowerCase());
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  if (site) {
    try { allowed.add(new URL(site).host.toLowerCase()); } catch { /* malformed: ignored */ }
  }
  return allowed.has(host) ? 'same' : 'foreign';
}

function refusal(status: number, error: string, message: string, headers?: Record<string, string>) {
  return NextResponse.json({ ok: false, error, message }, { status, headers: { 'Cache-Control': 'no-store', ...headers } });
}

export function adminClosedResponse() {
  return refusal(503, 'ADMIN_NOT_CONFIGURED', 'L’administration de cette bibliothèque est fermée : aucune clé n’est configurée sur le serveur.');
}

function bearerOf(request: NextRequest): string | null {
  const authorization = request.headers.get('authorization');
  if (authorization === null) return null;
  return authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
}

/**
 * Guard of every administration route and write. Returns the refusal to send, or null.
 * Checked before the body is read, so a refused request has no effect.
 */
export function requireAdmin(request: NextRequest): NextResponse | null {
  const key = configuredAdminKey();
  if (!key) return adminClosedResponse();
  const origin = requestOrigin(request);
  if (origin === 'foreign') {
    return refusal(403, 'ORIGIN_REFUSED', 'Ouvrez l’administration depuis cette bibliothèque.');
  }
  const bearer = bearerOf(request);
  if (bearer !== null) {
    return isAdminKey(bearer, key)
      ? null
      : refusal(401, 'ADMIN_UNAUTHORIZED', 'La clé d’administration est refusée.', { 'WWW-Authenticate': 'Bearer realm="argos-admin"' });
  }
  if (verifyAdminSession(request.cookies.get(ADMIN_SESSION_COOKIE)?.value, key)) {
    // A cookie travels by itself: a write authorised by it must also prove its origin.
    if (UNSAFE_METHODS.has(request.method) && origin !== 'same') {
      return refusal(403, 'ORIGIN_REFUSED', 'Une écriture par session doit venir de cette bibliothèque.');
    }
    return null;
  }
  return refusal(401, 'ADMIN_UNAUTHORIZED', 'Ouvrez une session d’administration, ou fournissez la clé.', { 'WWW-Authenticate': 'Bearer realm="argos-admin"' });
}

/**
 * Which channel of the single key authorised a request already admitted by `requireAdmin`:
 * a server client's Bearer header, or a browser session. Recorded with visibility changes and
 * purges ("who" is a channel: the key carries no identity, ADR-0009).
 */
export function adminChannel(request: NextRequest): 'admin-bearer' | 'admin-session' {
  return bearerOf(request) !== null ? 'admin-bearer' : 'admin-session';
}

/**
 * Does this request carry the administration key (valid Bearer or open session)? A missing or
 * refused key is not an error here: the request reads as anonymous.
 */
export function carriesAdminKey(request: NextRequest): boolean {
  const key = configuredAdminKey();
  if (!key) return false;
  const bearer = bearerOf(request);
  if (bearer !== null && isAdminKey(bearer, key)) return true;
  return verifyAdminSession(request.cookies.get(ADMIN_SESSION_COOKIE)?.value, key);
}

/** Has this browser an open administration session? (pages and middleware) */
export function hasAdminSession(cookieValue: string | null | undefined): boolean {
  const key = configuredAdminKey();
  return key !== null && verifyAdminSession(cookieValue, key);
}

/** Only an administration path of this library can follow a login (resolved as a browser would). */
export function safeAdminPath(candidate: unknown): string {
  const fallback = '/admin/ingest';
  if (typeof candidate !== 'string' || !candidate.startsWith('/') || candidate.includes('\\')) return fallback;
  if ([...candidate].some((c) => c.charCodeAt(0) < 0x20)) return fallback;
  const base = 'http://argos.invalid';
  let url: URL;
  try {
    url = new URL(candidate, base);
  } catch {
    return fallback;
  }
  if (url.origin !== base) return fallback;
  if (url.pathname !== '/admin' && !url.pathname.startsWith('/admin/')) return fallback;
  if (url.pathname === '/admin/login' || url.pathname.startsWith('/admin/login/') || url.pathname.includes('//')) return fallback;
  return `${url.pathname}${url.search}`;
}
