import Link from 'next/link';

export default function NotFound() {
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
          404
        </p>
        <h1
          style={{
            marginTop: 14,
            fontSize: 56,
            letterSpacing: '-0.03em',
            fontWeight: 600,
            lineHeight: 1.05,
            textWrap: 'balance',
            maxWidth: 640,
          }}
        >
          Pas encore dans la <span className="serif">bibliothèque.</span>
        </h1>
        <p
          style={{
            marginTop: 14,
            maxWidth: 520,
            fontSize: 15,
            color: 'var(--ink-2)',
            lineHeight: 1.55,
            textWrap: 'pretty',
          }}
        >
          Cette URL ne correspond à aucune opération indexée par Argos. Elle a peut-être bougé,
          ou c'est l'une des nombreuses choses pas encore documentées. Si vous avez un dossier
          à proposer, vous pouvez le soumettre.
        </p>
        <div style={{ marginTop: 28, display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link href="/" className="pill coral-solid" style={{ textDecoration: 'none' }}>
            ← Retour à Découvrir
          </Link>
          <Link href="/works" className="pill" style={{ textDecoration: 'none' }}>
            Toutes les opérations
          </Link>
          <Link href="/search" className="pill" style={{ textDecoration: 'none' }}>
            Rechercher
          </Link>
          <Link href="/admin/ingest" className="pill" style={{ textDecoration: 'none' }}>
            Soumettre un dossier
          </Link>
        </div>
      </div>
    </section>
  );
}
