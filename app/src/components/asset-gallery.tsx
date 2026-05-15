'use client';

import { TrendingUp, X } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { AssetLayout } from './asset-layout';
import { Badge } from './ui/badge';
import {
  ASSET_FUNCTION_LABELS,
  PERFORMANCE_METRIC_LABELS,
} from '@/lib/taxonomy';
import {
  type Asset,
  type AssetRole,
  type PerformanceMetric,
  type Reference,
  getMetricsForAsset,
} from '@/lib/types';
import { cn } from '@/lib/utils';

const ROLE_LABEL: Record<AssetRole, string> = {
  HERO: 'Hero',
  PRIMARY: 'Primary',
  DECLINATION: 'Declination',
  COMPANION: 'Companion',
  EXTRACTED: 'Extracted',
};

interface AssetGalleryProps {
  assets: Asset[];
  /** When provided, asset-level metrics are surfaced under each thumb. */
  reference?: Reference;
  className?: string;
}

export function AssetGallery({ assets, reference, className }: AssetGalleryProps) {
  const [focusedAsset, setFocusedAsset] = useState<Asset | null>(null);

  // Close on Escape
  useEffect(() => {
    if (!focusedAsset) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setFocusedAsset(null);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [focusedAsset]);

  if (assets.length === 0) return null;

  return (
    <>
      <div className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-3', className)}>
        {assets.map((asset) => {
          const metrics = reference ? getMetricsForAsset(reference, asset.id) : [];
          return (
            <button
              key={asset.id}
              type="button"
              onClick={() => setFocusedAsset(asset)}
              className="group flex flex-col gap-2 text-left transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-lg"
              aria-label={`Open ${asset.caption ?? asset.kind}`}
            >
              <div className="relative w-full">
                <ThumbForAsset asset={asset} />
                <div className="absolute left-2 top-2 flex flex-wrap gap-1">
                  <Badge variant="accent" className="text-[10px]">
                    {ASSET_FUNCTION_LABELS[asset.function]}
                  </Badge>
                  <Badge variant="outline" className="bg-background/80 text-[10px] backdrop-blur">
                    {ROLE_LABEL[asset.role]}
                  </Badge>
                </div>
                {metrics.length > 0 && (
                  <div className="absolute right-2 top-2">
                    <Badge variant="success" className="gap-1 text-[10px]">
                      <TrendingUp className="h-3 w-3" aria-hidden />
                      {metrics.length} metric{metrics.length > 1 ? 's' : ''}
                    </Badge>
                  </div>
                )}
              </div>
              <div>
                {asset.format && (
                  <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    {asset.format}
                  </p>
                )}
                {asset.caption && (
                  <p className="mt-1 line-clamp-2 text-sm text-foreground/90">
                    {asset.caption}
                  </p>
                )}
                {metrics.length > 0 && (
                  <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-success">
                    {metrics.slice(0, 2).map((m, i) => (
                      <li key={i}>
                        {PERFORMANCE_METRIC_LABELS[m.kind]}:{' '}
                        <strong className="font-display">
                          {m.displayValue ?? m.value}
                        </strong>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {focusedAsset && (
        <Lightbox
          asset={focusedAsset}
          metrics={reference ? getMetricsForAsset(reference, focusedAsset.id) : []}
          onClose={() => setFocusedAsset(null)}
        />
      )}
    </>
  );
}

function ThumbForAsset({ asset }: { asset: Asset }) {
  const aspectClass = {
    '1:1': 'aspect-square',
    '4:3': 'aspect-[4/3]',
    '3:4': 'aspect-[3/4]',
    '16:9': 'aspect-video',
    '9:16': 'aspect-[9/16]',
    '21:9': 'aspect-[21/9]',
    '4:5': 'aspect-[4/5]',
  }[asset.aspectRatio];

  if (asset.kind === 'TEXT') {
    const text = asset.text ?? '';
    const short = text.length < 80;
    return (
      <div
        className={cn(
          'relative flex w-full items-center justify-center overflow-hidden rounded-md border border-border bg-card p-6',
          aspectClass,
        )}
      >
        <blockquote
          className={cn(
            'font-display text-balance text-foreground',
            short ? 'text-xl md:text-2xl' : 'line-clamp-6 text-sm md:text-base',
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
          'relative flex w-full items-center justify-center overflow-hidden rounded-md border border-border bg-muted',
          aspectClass,
        )}
      >
        <span className="font-display text-3xl text-muted-foreground">♪</span>
      </div>
    );
  }

  const thumbUrl = asset.posterUrl ?? asset.url;
  const isPlayable =
    asset.kind === 'VIDEO' ||
    asset.kind === 'EMBED_YOUTUBE' ||
    asset.kind === 'EMBED_VIMEO';

  return (
    <div
      className={cn(
        'relative w-full overflow-hidden rounded-md border border-border bg-muted',
        aspectClass,
      )}
    >
      <Image
        src={thumbUrl}
        alt={asset.alt ?? asset.caption ?? ''}
        fill
        sizes="(max-width: 768px) 100vw, 33vw"
        className="object-cover transition-transform duration-500 group-hover:scale-105"
      />
      {isPlayable && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/30">
          <span className="rounded-full bg-black/60 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-white opacity-0 transition-opacity group-hover:opacity-100">
            ▶ Play
          </span>
        </div>
      )}
    </div>
  );
}

function Lightbox({
  asset,
  metrics,
  onClose,
}: {
  asset: Asset;
  metrics: PerformanceMetric[];
  onClose: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={asset.caption ?? 'Asset preview'}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 p-4 backdrop-blur-md animate-fade-in"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        aria-label="Close preview"
      >
        <X className="h-4 w-4" />
        Close
      </button>
      <div
        className="flex max-h-full max-w-5xl flex-col gap-4 overflow-auto"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        role="presentation"
      >
        <AssetLayout asset={asset} />
        <div className="flex items-baseline justify-between gap-4">
          <div>
            {asset.format && (
              <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                {asset.format}
              </p>
            )}
            {asset.caption && (
              <p className="mt-1 text-sm text-foreground/90">{asset.caption}</p>
            )}
          </div>
          <div className="flex shrink-0 gap-1.5">
            <Badge variant="accent" className="text-[10px]">
              {ASSET_FUNCTION_LABELS[asset.function]}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {ROLE_LABEL[asset.role]}
            </Badge>
          </div>
        </div>
        {metrics.length > 0 && (
          <div className="rounded-md border border-border bg-card p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Asset-level performance
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              {metrics.map((m, i) => (
                <li key={i} className="flex items-baseline justify-between gap-3">
                  <span className="text-muted-foreground">
                    {PERFORMANCE_METRIC_LABELS[m.kind]}
                  </span>
                  <span className="font-display text-lg">
                    {m.displayValue ?? m.value}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
