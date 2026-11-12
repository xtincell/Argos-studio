import { notFound } from 'next/navigation';
import { referenceExists } from '@/lib/library';
import { pageReadScope } from '@/server/read-scope';

// The fiche and its analytical view stream behind the skeleton of this segment (loading.tsx).
// The HTTP status leaves with the first byte, so the existence of the dossier is resolved here,
// before that boundary: an unknown slug, or a private dossier read without the key (ADR-0010),
// answers 404 with the not-found page, exactly alike.
export default async function WorkLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const [scope, { slug }] = await Promise.all([pageReadScope(), params]);
  if (!(await referenceExists(slug, scope))) notFound();
  return children;
}
