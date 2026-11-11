import type { Metadata } from 'next';
import Link from 'next/link';
import { configuredAdminKey, safeAdminPath } from '@/server/admin-access';

export const metadata: Metadata = {
  title: 'Administration',
  description: 'Ouvrir une session d’administration de la bibliothèque Argos.',
  robots: { index: false, follow: false },
};

// The state of the key is read on the server at each request, never at build time.
export const dynamic = 'force-dynamic';

interface LoginPageProps {
  searchParams: Promise<{ erreur?: string; next?: string; sortie?: string }>;
}

/** Readable wording for the refusals of /api/admin/login, which redirects form posts here. */
const LOGIN_ERRORS: Record<string, string> = {
  cle: 'La clé d’administration est refusée. Vérifiez-la, puis renvoyez le formulaire.',
  origine: 'La demande ne venait pas de cette bibliothèque. Rouvrez cette page, puis renvoyez le formulaire.',
  fermee: 'L’administration est fermée : aucune clé n’est configurée sur le serveur.',
  formulaire: 'Le formulaire n’a pas pu être lu. Renvoyez-le.',
};

const field = {
  width: '100%',
  minHeight: 44,
  background: 'var(--paper)',
  border: '1px solid var(--line)',
  borderRadius: 14,
  padding: '12px 14px',
  fontSize: 15,
  fontFamily: 'inherit',
  color: 'var(--ink)',
} as const;

export default async function AdminLoginPage({ searchParams }: LoginPageProps) {
  const { erreur, next, sortie } = await searchParams;
  const closed = configuredAdminKey() === null;
  const destination = safeAdminPath(next);
  const failure = erreur ? (LOGIN_ERRORS[erreur] ?? 'La connexion n’a pas abouti. Renvoyez le formulaire.') : null;
  return (
    <section className="view">
      <div className="wrap" style={{ maxWidth: 520, paddingTop: 60, paddingBottom: 60 }}>
        <p
          className="mono"
          style={{
            fontSize: 11,
            color: 'var(--ink-3)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            margin: 0,
            marginBottom: 12,
          }}
        >
          Administration · clé unique
        </p>
        <h1 style={{ fontSize: 42, letterSpacing: '-0.025em', margin: 0, fontWeight: 600, lineHeight: 1.05 }}>
          Ouvrir une <span className="serif">session.</span>
        </h1>
        <p style={{ marginTop: 14, fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.55 }}>
          L’admission et la correction des dossiers demandent la clé d’administration de cette
          bibliothèque. La lecture, la recherche et l’API publique restent ouvertes sans clé.
        </p>

        {sortie === '1' && !failure && (
          <output
            style={{
              display: 'block',
              marginTop: 24,
              padding: '14px 16px',
              background: 'rgba(58, 142, 92, 0.1)',
              border: '1px solid rgba(58, 142, 92, 0.3)',
              borderRadius: 14,
              fontSize: 14,
              color: '#1f5d3a',
            }}
          >
            Session fermée sur ce navigateur.
          </output>
        )}

        {(failure || closed) && (
          <div
            id="admin-login-error"
            role="alert"
            style={{
              marginTop: 24,
              padding: '14px 16px',
              background: '#fff1ec',
              border: '1px solid #e3a796',
              borderRadius: 14,
              fontSize: 14,
              color: '#7a2614',
            }}
          >
            {closed ? LOGIN_ERRORS.fermee : failure}
          </div>
        )}

        {!closed && (
          <form action="/api/admin/login" method="post" style={{ marginTop: 28 }}>
            <input type="hidden" name="next" value={destination} />
            <label
              htmlFor="admin-key"
              style={{ display: 'block', fontSize: 12.5, fontWeight: 500, marginBottom: 8, color: 'var(--ink-2)' }}
            >
              Clé d’administration
            </label>
            <input
              id="admin-key"
              name="key"
              type="password"
              autoComplete="current-password"
              required
              minLength={24}
              aria-invalid={failure ? true : undefined}
              aria-describedby={failure ? 'admin-login-error' : undefined}
              style={field}
            />
            <button
              type="submit"
              style={{
                width: '100%',
                minHeight: 44,
                background: 'var(--dark)',
                color: '#fff',
                border: 0,
                borderRadius: 14,
                padding: '13px 18px',
                fontSize: 14,
                fontFamily: 'inherit',
                fontWeight: 500,
                cursor: 'pointer',
                marginTop: 14,
              }}
            >
              Ouvrir la session
            </button>
            <p style={{ marginTop: 12, fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.6 }}>
              La clé n’est pas conservée par le navigateur : la session est un cookie signé,
              inaccessible aux scripts, valable huit heures au plus.
            </p>
          </form>
        )}

        <p style={{ marginTop: 32, fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.55 }}>
          <Link href="/" style={{ color: 'var(--coral)', textDecoration: 'underline' }}>
            Retour à la bibliothèque
          </Link>
        </p>
      </div>
    </section>
  );
}
