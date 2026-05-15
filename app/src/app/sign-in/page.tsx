import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Newsletter Argos',
  description:
    "Recevez les dossiers Argos par email. Une opération marketing analysée par envoi, sources vérifiables, sans bruit.",
};

interface NewsletterPageProps {
  searchParams: Promise<{ subscribed?: string }>;
}

export default async function NewsletterPage({ searchParams }: NewsletterPageProps) {
  const { subscribed } = await searchParams;
  const success = subscribed === '1';
  return (
    <section className="view">
      <div
        className="wrap"
        style={{
          maxWidth: 520,
          paddingTop: 60,
          paddingBottom: 60,
          minHeight: 'calc(100vh - 200px)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
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
          Newsletter · gratuit · pas de spam
        </p>
        <h1
          style={{
            fontSize: 42,
            letterSpacing: '-0.025em',
            margin: 0,
            fontWeight: 600,
            lineHeight: 1.05,
            textWrap: 'balance',
          }}
        >
          Un dossier <span className="serif">par envoi.</span>
        </h1>
        <p style={{ marginTop: 14, fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.55 }}>
          Recevez les nouvelles opérations Argos par email : <b>une opération marketing
          analysée par envoi</b>, axes structurels notés, métriques sourcées, images sous
          licence libre. Pas de bruit, pas de promo, pas de tracking publicitaire.
        </p>

        {success && (
          <div
            style={{
              marginTop: 24,
              padding: '14px 16px',
              background: 'rgba(58, 142, 92, 0.1)',
              border: '1px solid rgba(58, 142, 92, 0.3)',
              borderRadius: 14,
              fontSize: 14,
              color: '#1f5d3a',
            }}
          >
            ✓ Inscription enregistrée. Le prochain dossier Argos arrivera dans votre boîte.
          </div>
        )}

        <form
          action="/api/newsletter"
          method="post"
          style={{ marginTop: 28 }}
        >
          <label
            htmlFor="email"
            style={{
              display: 'block',
              fontSize: 12.5,
              fontWeight: 500,
              marginBottom: 8,
              color: 'var(--ink-2)',
            }}
          >
            Votre email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="vous@studio.com"
            required
            style={{
              width: '100%',
              background: 'var(--paper)',
              border: '1px solid var(--line)',
              borderRadius: 14,
              padding: '12px 14px',
              fontSize: 15,
              fontFamily: 'inherit',
              color: 'var(--ink)',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            style={{
              width: '100%',
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
              letterSpacing: '-0.005em',
            }}
          >
            S'inscrire à la newsletter
          </button>
        </form>

        <p style={{ marginTop: 24, fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.6 }}>
          En vous inscrivant, vous acceptez la{' '}
          <Link href="/privacy" style={{ color: 'var(--ink-2)', textDecoration: 'underline' }}>
            politique de confidentialité
          </Link>{' '}
          et les{' '}
          <Link href="/terms" style={{ color: 'var(--ink-2)', textDecoration: 'underline' }}>
            conditions
          </Link>
          . Désinscription en un clic depuis chaque envoi.
        </p>

        <div
          style={{
            marginTop: 32,
            paddingTop: 24,
            borderTop: '1px solid var(--line-soft)',
            fontSize: 13,
            color: 'var(--ink-3)',
            lineHeight: 1.55,
          }}
        >
          La bibliothèque est{' '}
          <Link href="/" style={{ color: 'var(--coral)', textDecoration: 'underline' }}>
            consultable librement
          </Link>
          . La newsletter est un complément éditorial — un envoi quand un dossier majeur est publié.
        </div>
      </div>
    </section>
  );
}
