import Link from 'next/link';

export interface EntityIndexItem {
  slug: string;
  label: string;
  count: number;
  sublabel?: string;
}

export function EntityIndexShell({
  eyebrow,
  title,
  description,
  baseHref,
  items,
  emptyMessage = 'Rien à afficher pour l\'instant.',
}: {
  eyebrow: string;
  title: { head: string; tail: string };
  description?: string;
  baseHref: string;
  items: EntityIndexItem[];
  emptyMessage?: string;
}) {
  return (
    <section className="view">
      <div className="wrap" style={{ paddingTop: 40, paddingBottom: 80 }}>
        <header style={{ marginBottom: 28 }}>
          <p
            className="mono"
            style={{
              fontSize: 11,
              color: 'var(--ink-3)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              margin: 0,
              marginBottom: 10,
            }}
          >
            {eyebrow} · {items.length} entrée{items.length > 1 ? 's' : ''}
          </p>
          <h1
            style={{
              fontSize: 44,
              letterSpacing: '-0.025em',
              margin: 0,
              fontWeight: 600,
              textWrap: 'balance',
            }}
          >
            {title.head} <span className="serif">{title.tail}</span>
          </h1>
          {description && (
            <p
              style={{
                marginTop: 12,
                maxWidth: 760,
                fontSize: 15,
                color: 'var(--ink-2)',
                lineHeight: 1.55,
              }}
            >
              {description}
            </p>
          )}
        </header>

        {items.length === 0 ? (
          <div
            style={{
              padding: 32,
              border: '1px solid var(--line)',
              borderRadius: 18,
              background: 'var(--paper)',
              textAlign: 'center',
              color: 'var(--ink-2)',
              fontSize: 14,
            }}
          >
            {emptyMessage}
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: 12,
            }}
          >
            {items
              .slice()
              .sort((a, b) => b.count - a.count)
              .map((item) => (
                <Link
                  key={item.slug}
                  href={`${baseHref}/${item.slug}`}
                  style={{
                    background: 'var(--paper)',
                    border: '1px solid var(--line)',
                    borderRadius: 16,
                    padding: 18,
                    textDecoration: 'none',
                    color: 'inherit',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: 96,
                    transition: 'border-color 0.15s, transform 0.15s',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: 12,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 16,
                        fontWeight: 600,
                        color: 'var(--ink)',
                        letterSpacing: '-0.005em',
                        flex: 1,
                      }}
                    >
                      {item.label}
                    </span>
                    <span
                      className="mono"
                      style={{
                        fontSize: 13,
                        color: 'var(--coral)',
                        fontWeight: 600,
                        flexShrink: 0,
                      }}
                    >
                      {item.count}
                    </span>
                  </div>
                  {item.sublabel && (
                    <div
                      style={{
                        marginTop: 8,
                        fontSize: 12,
                        color: 'var(--ink-3)',
                        lineHeight: 1.4,
                      }}
                    >
                      {item.sublabel}
                    </div>
                  )}
                </Link>
              ))}
          </div>
        )}
      </div>
    </section>
  );
}
