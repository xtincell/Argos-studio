import Link from 'next/link';

export function WorkViewTabs({
  slug,
  active,
}: {
  slug: string;
  active: 'read' | 'inspect';
}) {
  return (
    <div
      className="mono"
      style={{
        display: 'inline-flex',
        gap: 4,
        padding: 4,
        background: 'var(--paper)',
        border: '1px solid var(--line)',
        borderRadius: 999,
        fontSize: 11,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        marginBottom: 18,
      }}
    >
      <Link
        href={`/work/${slug}`}
        className={active === 'read' ? 'tab on' : 'tab'}
        style={{
          padding: '6px 14px',
          borderRadius: 999,
          textDecoration: 'none',
          background: active === 'read' ? 'var(--dark)' : 'transparent',
          color: active === 'read' ? '#fff' : 'var(--ink-2)',
          transition: 'background 0.15s',
        }}
      >
        Lire
      </Link>
      <Link
        href={`/work/${slug}/inspect`}
        className={active === 'inspect' ? 'tab on' : 'tab'}
        style={{
          padding: '6px 14px',
          borderRadius: 999,
          textDecoration: 'none',
          background: active === 'inspect' ? 'var(--dark)' : 'transparent',
          color: active === 'inspect' ? '#fff' : 'var(--ink-2)',
          transition: 'background 0.15s',
        }}
      >
        Inspecter
      </Link>
    </div>
  );
}
