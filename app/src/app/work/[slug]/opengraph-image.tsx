import { ImageResponse } from 'next/og';
import { getReferenceBySlug } from '@/lib/library';

export const runtime = 'nodejs';
export const alt = 'Argos — dossier';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Editorial OG card. Cream background, coral accent, mono caption.
export default async function OgImage({ params }: { params: { slug: string } }) {
  const reference = await getReferenceBySlug(params.slug);
  const title = reference?.title ?? 'Argos';
  const brand = reference?.brandEmitter ?? '';
  const year = reference?.emissionYear ?? '';
  const sector = reference?.sector ?? '';
  const summary = reference?.summary ?? '';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#efe7d4',
          padding: 64,
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'system-ui, sans-serif',
          color: '#2b1f12',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 16,
            letterSpacing: 4,
            textTransform: 'uppercase',
            color: '#6f5634',
          }}
        >
          <span>DOSSIER · {reference?.slug?.slice(0, 24) ?? 'argos'}</span>
          <span style={{ color: '#cc4d2e', fontWeight: 600 }}>ARGOS</span>
        </div>

        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: 24,
          }}
        >
          <div
            style={{
              fontSize: 24,
              color: '#cc4d2e',
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              fontWeight: 600,
            }}
          >
            {brand}
            {year ? ` · ${year}` : ''}
            {sector ? ` · ${sector}` : ''}
          </div>

          <div
            style={{
              fontSize: 76,
              fontWeight: 700,
              letterSpacing: -2,
              lineHeight: 1.05,
              maxWidth: 1000,
            }}
          >
            {title}
          </div>

          {summary && (
            <div
              style={{
                fontSize: 26,
                lineHeight: 1.4,
                color: '#54422c',
                maxWidth: 1000,
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {summary}
            </div>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            color: '#6f5634',
            fontSize: 18,
            letterSpacing: 0.5,
          }}
        >
          <span>Bibliothèque éditoriale des opérations marketing</span>
          <span style={{ fontWeight: 600, color: '#2b1f12' }}>argos.studio</span>
        </div>
      </div>
    ),
    size,
  );
}
