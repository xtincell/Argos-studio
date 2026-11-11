import { redirect } from 'next/navigation';
import { requireAdminPage } from '@/server/admin-page';

export const dynamic = 'force-dynamic';

/** /admin has a single page today: the manual admission. */
export default async function AdminIndexPage() {
  await requireAdminPage('/admin/ingest');
  redirect('/admin/ingest');
}
