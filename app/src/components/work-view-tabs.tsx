import Link from 'next/link';

/** Two views of the same reference. Links between pages, not ARIA tabs: the current one is marked. */
export function WorkViewTabs({
  slug,
  active,
}: {
  slug: string;
  active: 'read' | 'inspect';
}) {
  return (
    <nav className="mono work-tabs" aria-label="Vues de la référence">
      <Link
        href={`/work/${slug}`}
        className={active === 'read' ? 'tab on' : 'tab'}
        aria-current={active === 'read' ? 'page' : undefined}
      >
        Lire
      </Link>
      <Link
        href={`/work/${slug}/inspect`}
        className={active === 'inspect' ? 'tab on' : 'tab'}
        aria-current={active === 'inspect' ? 'page' : undefined}
      >
        Inspecter
      </Link>
    </nav>
  );
}
