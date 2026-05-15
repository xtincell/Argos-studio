export default function Loading() {
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
