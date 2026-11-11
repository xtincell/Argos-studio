// Guard of every administration page (server components). The middleware already sends
// a browser without session to the login page; this check holds even if a page escapes
// its matcher, before any administration content is rendered.

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ADMIN_SESSION_COOKIE, hasAdminSession, safeAdminPath } from '@/server/admin-access';

export async function requireAdminPage(returnTo: string): Promise<void> {
  const session = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;
  if (!hasAdminSession(session)) {
    redirect(`/admin/login?${new URLSearchParams({ next: safeAdminPath(returnTo) }).toString()}`);
  }
}
