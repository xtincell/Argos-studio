import Link from 'next/link';
import { Logo } from './logo';

const FOOTER_SECTIONS = [
  {
    title: 'Lire',
    links: [
      { href: '/works', label: 'Toutes les opérations' },
      { href: '/patterns', label: 'Patterns' },
      { href: '/assets', label: 'Bibliothèque d\'assets' },
      { href: '/search', label: 'Rechercher' },
    ],
  },
  {
    title: 'Méthode',
    links: [
      { href: '/about', label: 'À propos' },
      { href: '/glossary', label: 'Glossaire' },
      { href: '/docs/research-dossier-spec', label: 'Schema dossier' },
      { href: '/docs/api', label: 'API' },
      { href: '/admin/ingest', label: 'Soumettre un dossier' },
    ],
  },
  {
    title: 'Argos',
    links: [
      { href: '/sign-in', label: 'Newsletter' },
      { href: '/terms', label: 'Conditions' },
      { href: '/privacy', label: 'Confidentialité' },
    ],
  },
] as const;

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer style={{ borderTop: '1px solid var(--line)', background: 'var(--paper)', marginTop: 80 }}>
      <div className="wrap" style={{ paddingTop: 48, paddingBottom: 48 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.4fr 1fr 1fr 1fr',
            gap: 40,
          }}
        >
          <div>
            <Logo />
            <p
              style={{
                marginTop: 14,
                maxWidth: 320,
                fontSize: 13,
                color: 'var(--ink-2)',
                lineHeight: 1.5,
              }}
            >
              Bibliothèque éditoriale des opérations marketing qui ont fait école.
              Dossiers vérifiés, sources libres, taxonomie 22 axes.
            </p>
          </div>
          {FOOTER_SECTIONS.map((section) => (
            <div key={section.title}>
              <h4
                className="mono"
                style={{
                  fontSize: 11,
                  color: 'var(--ink-3)',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  fontWeight: 500,
                  margin: 0,
                  marginBottom: 12,
                }}
              >
                {section.title}
              </h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8 }}>
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      style={{
                        fontSize: 13,
                        color: 'var(--ink)',
                        textDecoration: 'none',
                        transition: 'color 0.15s',
                      }}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div
          style={{
            marginTop: 40,
            paddingTop: 24,
            borderTop: '1px solid var(--line-soft)',
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
            gap: 16,
            fontSize: 12,
            color: 'var(--ink-3)',
            flexWrap: 'wrap',
          }}
        >
          <p style={{ margin: 0 }}>© {year} Argos · Tous droits réservés.</p>
          <p style={{ margin: 0 }}>Construit à Yaoundé · Paris · São Paulo</p>
        </div>
      </div>
    </footer>
  );
}
