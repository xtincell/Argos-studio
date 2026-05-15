import Image from 'next/image';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { ASSET_FUNCTION_LABELS } from '@/lib/taxonomy';
import type { AssetWithRef } from '@/lib/library';
import type { Asset } from '@/lib/types';
import { cn } from '@/lib/utils';

const ASPECT_CLASS = {
  '1:1': 'aspect-square',
  '4:3': 'aspect-[4/3]',
  '3:4': 'aspect-[3/4]',
  '16:9': 'aspect-video',
  '9:16': 'aspect-[9/16]',
  '21:9': 'aspect-[21/9]',
  '4:5': 'aspect-[4/5]',
} as const;

export function AssetMiniCard({ item }: { item: AssetWithRef }) {
  const { asset, reference } = item;
  return (
    <Link
      href={`/asset/${asset.id}`}
      className="group flex flex-col gap-2 rounded-md transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <Thumb asset={asset} />
      <div>
        <Badge variant="accent" className="text-[10px]">
          {ASSET_FUNCTION_LABELS[asset.function]}
        </Badge>
        {asset.format && (
          <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {asset.format}
          </p>
        )}
        <p className="mt-0.5 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{reference.brandEmitter}</span> ·{' '}
          {reference.emissionYear} · {reference.sector}
        </p>
      </div>
    </Link>
  );
}

function Thumb({ asset }: { asset: Asset }) {
  const aspect = ASPECT_CLASS[asset.aspectRatio];

  if (asset.kind === 'TEXT') {
    const text = asset.text ?? '';
    const short = text.length < 80;
    return (
      <div
        className={cn(
          'flex w-full items-center justify-center overflow-hidden rounded-md border border-border bg-card p-4 transition-colors group-hover:border-accent/40',
          aspect,
        )}
      >
        <blockquote
          className={cn(
            'font-display text-balance text-foreground',
            short ? 'text-lg md:text-xl' : 'line-clamp-5 text-xs md:text-sm',
          )}
        >
          {short ? text : <p className="text-pretty">{text}</p>}
        </blockquote>
      </div>
    );
  }

  if (asset.kind === 'AUDIO') {
    return (
      <div
        className={cn(
          'relative flex w-full items-center justify-center overflow-hidden rounded-md border border-border bg-muted transition-colors group-hover:border-accent/40',
          aspect,
        )}
      >
        <span className="font-display text-3xl text-muted-foreground">♪</span>
      </div>
    );
  }

  const url = asset.posterUrl ?? asset.url;
  const playable =
    asset.kind === 'VIDEO' || asset.kind === 'EMBED_YOUTUBE' || asset.kind === 'EMBED_VIMEO';
  return (
    <div
      className={cn(
        'relative w-full overflow-hidden rounded-md border border-border bg-muted transition-colors group-hover:border-accent/40',
        aspect,
      )}
    >
      {url && (
        <Image
          src={url}
          alt={asset.alt ?? asset.caption ?? ''}
          fill
          sizes="(max-width: 768px) 100vw, 25vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
      )}
      {playable && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/30">
          <span className="rounded-full bg-black/60 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-white opacity-0 transition-opacity group-hover:opacity-100">
            ▶ Play
          </span>
        </div>
      )}
    </div>
  );
}
