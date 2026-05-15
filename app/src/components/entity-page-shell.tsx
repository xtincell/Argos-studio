import Link from 'next/link';
import type { Reference, VictoryType } from '@/lib/types';
import { VICTORY_LABELS } from '@/lib/taxonomy';

function humanVictory(v: VictoryType): string {
  return VICTORY_LABELS[v] ?? v;
}

interface Stat {
  label: string;
  value: string | number;
}

interface SideTag {
  label: string;
  href?: string;
  variant?: 'default' | 'coral' | 'butter' | 'sage' | 'lav';
}

interface SidePanel {
  title: string;
  tags: SideTag[];
}

export interface EntityPageShellProps {
  eyebrow: string;
  /** Plain text name — last token becomes serif italic for editorial rhythm. */
  name: string;
  description?: string;
  stats?: Stat[];
  /** Legacy single side rail content (replaced by sidePanels). */
  sideRail?: React.ReactNode;
  /** Structured side panels (preferred). */
  sidePanels?: SidePanel[];
  /** Optional extra section under the grid. */
  extraSection?: React.ReactNode;
  references: Reference[];
}

export function EntityPageShell({
  eyebrow,
  name,
  description,
  stats,
  sideRail,
  sidePanels,
  extraSection,
  references,
}: EntityPageShellProps) {
  const tokens = name.trim().split(/\s+/);
  const head = tokens.slice(0, -1).join(' ');
  const tail = tokens[tokens.length - 1] ?? name;

  return (
    <section className="view">
      <div className="wrap entity-page">
        <header className="entity-hero">
          <div className="eyebrow">{eyebrow}</div>
          <h1>
            {head ? `${head} ` : ''}
            <span className="serif">{tail}</span>
          </h1>
          {description && <p className="deck">{description}</p>}
          {stats && stats.length > 0 && (
            <div className="stats">
              {stats.map((s) => (
                <div key={s.label} className="s">
                  <div className="k">{s.label}</div>
                  <div className="v">{s.value}</div>
                </div>
              ))}
            </div>
          )}
        </header>

        {sidePanels && sidePanels.length > 0 && (
          <div className="entity-side-rail">
            {sidePanels.map((panel) => (
              <div key={panel.title} className="panel">
                <h3>{panel.title}</h3>
                <div className="tags">
                  {panel.tags.length > 0 ? (
                    panel.tags.map((tag, i) => {
                      const cls = `pill ${
                        tag.variant && tag.variant !== 'default' ? tag.variant : ''
                      }`.trim();
                      return tag.href ? (
                        <Link
                          key={`${tag.label}-${i}`}
                          href={tag.href}
                          className={cls}
                          style={{ textDecoration: 'none' }}
                        >
                          {tag.label}
                        </Link>
                      ) : (
                        <span key={`${tag.label}-${i}`} className={cls}>
                          {tag.label}
                        </span>
                      );
                    })
                  ) : (
                    <span style={{ fontSize: 12, color: 'var(--ink-3)', fontStyle: 'italic' }}>
                      Aucun pour l'instant.
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {sideRail && !sidePanels && (
          <div className="entity-side-rail">
            <div className="panel" style={{ gridColumn: 'span 2' }}>
              {sideRail}
            </div>
          </div>
        )}

        {references.length === 0 ? (
          <div className="empty-results">
            <h2>
              Aucune <span className="serif">référence</span> ici pour l'instant.
            </h2>
            <p>
              Rien n'est indexé pour cette entrée. Vous pouvez soumettre un dossier de recherche via{' '}
              <Link href="/admin/ingest" style={{ color: 'var(--coral)' }}>
                /admin/ingest
              </Link>
              .
            </p>
          </div>
        ) : (
          <div className="search-results">
            {references.map((r) => (
              <ReferenceResultRow key={r.id} reference={r} />
            ))}
          </div>
        )}

        {extraSection ? <div style={{ marginTop: 22 }}>{extraSection}</div> : null}
      </div>
    </section>
  );
}

function ReferenceResultRow({ reference: r }: { reference: Reference }) {
  const phClass = `ph-${((r.brandEmitter.length + r.emissionYear) % 6) + 1}`;
  return (
    <Link href={`/work/${r.slug}`} className="result-row">
      <div className={`ph ${phClass}`}>
        <span className="yr">{r.emissionYear}</span>
      </div>
      <div className="body">
        <div className="pills">
          <span className="pill butter">{r.sector}</span>
          <span className="pill">{r.marketPrimary}</span>
          {r.manipulationMode && (
            <span className="pill sage">
              {r.manipulationMode.charAt(0) + r.manipulationMode.slice(1).toLowerCase()}
            </span>
          )}
        </div>
        <h3>{r.title}</h3>
        <div className="by">
          <b>{r.brandEmitter}</b>
          {r.agencyCreator ? ` · ${r.agencyCreator}` : ''}
        </div>
        <p className="sum">{r.summary}</p>
      </div>
      <div className="meta">
        <div className="sc">{r.performance.composite}</div>
        <div className="sc-lab">Score</div>
        {r.victoryTypes[0] && (
          <div className="victory">
            {humanVictory(r.victoryTypes[0])}
          </div>
        )}
      </div>
    </Link>
  );
}
