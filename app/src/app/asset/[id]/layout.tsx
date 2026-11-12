import { notFound } from 'next/navigation';
import { assetExists } from '@/lib/library';
import { pageReadScope } from '@/server/read-scope';

// The asset page streams behind the skeleton of this segment (loading.tsx). The HTTP status
// leaves with the first byte, so the existence of the asset is resolved here, before that
// boundary: an unknown asset, or an asset of a private dossier read without the key
// (ADR-0010), answers 404 with the not-found page, exactly alike.
export default async function AssetLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const [scope, { id }] = await Promise.all([pageReadScope(), params]);
  if (!(await assetExists(id, scope))) notFound();
  return children;
}
