// Loading skeleton of a page while the server reads it (shown by a `loading.tsx`).
//
// A loading boundary starts the HTTP response, and its status, before the page behind it has
// rendered. It is therefore only placed above pages that cannot answer not found, or in a
// segment whose layout has already resolved the existence of what the page shows — otherwise
// an unknown address would answer 200 instead of 404 (tests/not-found-status.test.ts).

export function PageSkeleton() {
  return (
    <section className="view">
      <div
        className="wrap"
        style={{
          paddingTop: 60,
          paddingBottom: 60,
        }}
      >
        <div
          style={{
            display: 'grid',
            gap: 16,
            maxWidth: 720,
          }}
        >
          <div
            style={{
              height: 12,
              width: 140,
              background: 'var(--line-soft)',
              borderRadius: 4,
              opacity: 0.6,
            }}
          />
          <div
            style={{
              height: 48,
              width: '90%',
              background: 'var(--line-soft)',
              borderRadius: 8,
              opacity: 0.6,
            }}
          />
          <div
            style={{
              height: 48,
              width: '70%',
              background: 'var(--line-soft)',
              borderRadius: 8,
              opacity: 0.5,
            }}
          />
          <div
            style={{
              height: 14,
              width: '60%',
              marginTop: 12,
              background: 'var(--line-soft)',
              borderRadius: 4,
              opacity: 0.5,
            }}
          />
          <div
            style={{
              height: 14,
              width: '55%',
              background: 'var(--line-soft)',
              borderRadius: 4,
              opacity: 0.5,
            }}
          />
        </div>
      </div>
    </section>
  );
}
