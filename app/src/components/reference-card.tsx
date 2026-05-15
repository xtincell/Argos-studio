import { Film, Image as ImageIcon, Layers, Music, Play, Quote } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import {
  ASSET_FUNCTION_LABELS,
  MANIPULATION_MODE_LABELS,
  PATTERN_KIND_LABELS,
} from '@/lib/taxonomy';
import { type Asset, type AssetKind, type Reference, getHeroAsset } from '@/lib/types';
import { cn } from '@/lib/utils';
import { VictoryBadge } from './victory-badge';

/**
 * Pick the best visual asset for a card thumbnail.
 * If the hero is a TEXT asset (tagline / manifesto), it doesn't render in a thumbnail —
 * fall back to the first visual asset (image/video) so the card stays scannable.
 */
function pickThumbAsset(reference: Reference): Asset | undefined {
  const hero = getHeroAsset(reference);
  if (hero && hero.kind !== 'TEXT' && hero.kind !== 'AUDIO') return hero;
  return (
    reference.assets.find((a) => a.kind === 'IMAGE') ??
    reference.assets.find((a) => a.kind === 'VIDEO') ??
    hero
  );
}

interface ReferenceCardProps {
  reference: Reference;
  variant?: 'grid' | 'list';
  className?: string;
}

export function ReferenceCard({
  reference,
  variant = 'grid',
  className,
}: ReferenceCardProps) {
  if (variant === 'list') return <ReferenceCardList reference={reference} className={className} />;
  return <ReferenceCardGrid reference={reference} className={className} />;
}

function AssetKindIcon({ kind, className }: { kind: AssetKind; className?: string }) {
  switch (kind) {
    case 'VIDEO':
    case 'EMBED_YOUTUBE':
    case 'EMBED_VIMEO':
      return <Film className={className} aria-hidden />;
    case 'AUDIO':
      return <Music className={className} aria-hidden />;
    case 'TEXT':
      return <Quote className={className} aria-hidden />;
    case 'IMAGE':
      return <ImageIcon className={className} aria-hidden />;
  }
}

function MediaOverlay({ reference, thumbAsset }: { reference: Reference; thumbAsset?: Asset }) {
  const hero = getHeroAsset(reference);
  if (!hero) return null;
  const moreAssets = reference.assets.length - 1;
  const isPlayable =
    thumbAsset?.kind === 'VIDEO' ||
    thumbAsset?.kind === 'EMBED_YOUTUBE' ||
    thumbAsset?.kind === 'EMBED_VIMEO';

  // Show the hero's function (TAGLINE, TVC, etc.) — this is what the brand actually delivered first
  const heroFunction = ASSET_FUNCTION_LABELS[hero.function];

  return (
    <>
      {isPlayable && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-black/70 text-white backdrop-blur-sm transition-transform duration-300 group-hover:scale-110">
            <Play className="h-6 w-6 fill-current" aria-hidden />
          </div>
        </div>
      )}
      <div className="absolute left-3 top-3 flex flex-wrap gap-1">
        <Badge variant="accent" className="gap-1 text-[10px]">
          <AssetKindIcon kind={hero.kind} className="h-3 w-3" />
          {heroFunction}
        </Badge>
        {moreAssets > 0 && (
          <Badge variant="outline" className="gap-1 bg-background/80 text-[10px] backdrop-blur">
            <Layers className="h-3 w-3" aria-hidden />+{moreAssets}
          </Badge>
        )}
      </div>
    </>
  );
}

function ReferenceCardGrid({
  reference,
  className,
}: { reference: Reference; className?: string }) {
  const thumbAsset = pickThumbAsset(reference);
  const thumbUrl = thumbAsset?.posterUrl ?? thumbAsset?.url;
  return (
    <Link
      href={`/work/${reference.slug}`}
      className={cn(
        'group flex flex-col overflow-hidden rounded-lg border border-border bg-card transition-colors hover:border-accent/50 focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
        className,
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {thumbUrl && thumbAsset?.kind !== 'TEXT' && thumbAsset?.kind !== 'AUDIO' && (
          <Image
            src={thumbUrl}
            alt={thumbAsset?.alt ?? ''}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 33vw, 400px"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        )}
        <MediaOverlay reference={reference} thumbAsset={thumbAsset} />
        {reference.victoryTypes.length > 0 && (
          <div className="absolute inset-x-0 bottom-0 flex flex-wrap gap-1 bg-gradient-to-t from-black/80 to-transparent p-3 pt-12">
            {reference.victoryTypes.slice(0, 2).map((v) => (
              <VictoryBadge key={v} type={v} />
            ))}
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          {reference.brandEmitter} · {reference.emissionYear}
        </p>
        <h3 className="mt-1 font-display text-lg leading-tight text-balance text-foreground">
          {reference.title}
        </h3>
        <div className="mt-auto flex flex-wrap gap-1.5 pt-3">
          <Badge variant="outline" className="text-[10px]">
            {MANIPULATION_MODE_LABELS[reference.manipulationMode]}
          </Badge>
          <Badge variant="ghost" className="text-[10px]">
            {reference.marketPrimary}
          </Badge>
        </div>
      </div>
    </Link>
  );
}

function ReferenceCardList({
  reference,
  className,
}: { reference: Reference; className?: string }) {
  const thumbAsset = pickThumbAsset(reference);
  const thumbUrl = thumbAsset?.posterUrl ?? thumbAsset?.url;
  return (
    <Link
      href={`/work/${reference.slug}`}
      className={cn(
        'group flex gap-4 rounded-lg border border-border bg-card p-4 transition-colors hover:border-accent/50 focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
        className,
      )}
    >
      <div className="relative h-24 w-32 shrink-0 overflow-hidden rounded-md bg-muted">
        {thumbUrl && thumbAsset?.kind !== 'TEXT' && thumbAsset?.kind !== 'AUDIO' && (
          <Image
            src={thumbUrl}
            alt={thumbAsset?.alt ?? ''}
            fill
            sizes="128px"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        )}
        <MediaOverlay reference={reference} thumbAsset={thumbAsset} />
      </div>
      <div className="flex flex-1 flex-col">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          {reference.brandEmitter} · {reference.agencyCreator ?? '—'} ·{' '}
          {reference.emissionYear}
        </p>
        <h3 className="mt-1 font-display text-lg leading-tight text-foreground">
          {reference.title}
        </h3>
        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{reference.summary}</p>
        <div className="mt-auto flex flex-wrap gap-1.5 pt-3">
          <Badge variant="outline" className="text-[10px]">
            {PATTERN_KIND_LABELS[reference.patternKind]}
          </Badge>
          <Badge variant="outline" className="text-[10px]">
            {MANIPULATION_MODE_LABELS[reference.manipulationMode]}
          </Badge>
          <Badge variant="ghost" className="text-[10px]">
            {reference.marketPrimary}
          </Badge>
          {reference.victoryTypes.slice(0, 1).map((v) => (
            <VictoryBadge key={v} type={v} />
          ))}
        </div>
      </div>
    </Link>
  );
}
