'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useTransition } from 'react';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  const title = useRef<HTMLHeadingElement>(null);
  const [retrying, startRetry] = useTransition();

  useEffect(() => {
    // Log côté navigateur — le serveur journalise de son côté l'erreur et son digest.
    console.error('[argos] runtime error:', error);
  }, [error]);

  useEffect(() => {
    // The failure replaces the page: keyboard and screen-reader focus go to its explanation.
    title.current?.focus();
  }, []);

  // reset() alone re-renders the failed server payload; refresh() fetches the page again.
  const retry = () => startRetry(() => { router.refresh(); reset(); });

  return (
    <section className="view">
      <div
        className="wrap"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          minHeight: 'calc(100vh - 200px)',
          paddingTop: 60,
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
          }}
        >
          Erreur serveur
        </p>
        <h1
          ref={title}
          tabIndex={-1}
          style={{
            marginTop: 14,
            fontSize: 48,
            letterSpacing: '-0.025em',
            fontWeight: 600,
            lineHeight: 1.1,
            textWrap: 'balance',
            maxWidth: 640,
          }}
        >
          Quelque chose a <span className="serif">cassé.</span>
        </h1>
        <p
          style={{
            marginTop: 14,
            maxWidth: 520,
            fontSize: 15,
            color: 'var(--ink-2)',
            lineHeight: 1.55,
          }}
        >
          La bibliothèque est temporairement indisponible : cette page n’a pas pu être lue. Ce
          n’est pas une absence de données. Vous pouvez réessayer ou retourner à l’accueil.
        </p>
        {error.digest && (
          <p
            className="mono"
            style={{
              marginTop: 12,
              fontSize: 11,
              color: 'var(--ink-3)',
            }}
          >
            ref · {error.digest}
          </p>
        )}
        <div style={{ marginTop: 28, display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={retry}
            disabled={retrying}
            aria-busy={retrying}
            className="pill coral-solid"
            style={{ textDecoration: 'none', border: 0, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            {retrying ? 'Nouvel essai…' : 'Réessayer'}
          </button>
          <Link href="/" className="pill" style={{ textDecoration: 'none' }}>
            ← Retour à Découvrir
          </Link>
        </div>
      </div>
    </section>
  );
}
