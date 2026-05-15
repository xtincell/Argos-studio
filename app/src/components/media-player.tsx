'use client';

import { PlayCircle } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import type { Asset } from '@/lib/types';
import { cn } from '@/lib/utils';

const ASPECT_CLASS: Record<Asset['aspectRatio'], string> = {
  '1:1': 'aspect-square',
  '4:3': 'aspect-[4/3]',
  '3:4': 'aspect-[3/4]',
  '16:9': 'aspect-video',
  '9:16': 'aspect-[9/16]',
  '21:9': 'aspect-[21/9]',
  '4:5': 'aspect-[4/5]',
};

interface MediaPlayerProps {
  asset: Asset;
  className?: string;
  priority?: boolean;
  sizes?: string;
  /** When true, image is rendered with fill — useful inside a sized container */
  fill?: boolean;
}

export function MediaPlayer({
  asset,
  className,
  priority,
  sizes,
  fill = false,
}: MediaPlayerProps) {
  switch (asset.kind) {
    case 'IMAGE':
      return (
        <ImageAsset
          asset={asset}
          className={className}
          priority={priority}
          sizes={sizes}
          fill={fill}
        />
      );
    case 'VIDEO':
      return <VideoAsset asset={asset} className={className} />;
    case 'AUDIO':
      return <AudioAsset asset={asset} className={className} />;
    case 'TEXT':
      return <TextAsset asset={asset} className={className} />;
    case 'EMBED_YOUTUBE':
      return <YouTubeEmbed asset={asset} className={className} />;
    case 'EMBED_VIMEO':
      return <VimeoEmbed asset={asset} className={className} />;
  }
}

function TextAsset({ asset, className }: { asset: Asset; className?: string }) {
  const text = asset.text ?? '';
  // Heuristic typography scale based on the marketing function
  const isShortPunch =
    asset.function === 'TAGLINE' ||
    asset.function === 'HEADLINE' ||
    asset.function === 'SOUND_LOGO';
  const isLongForm =
    asset.function === 'MANIFESTO' ||
    asset.function === 'BODY_COPY' ||
    asset.function === 'CLAIM';

  return (
    <div
      className={cn(
        'relative flex w-full flex-col justify-center overflow-hidden rounded-lg border border-border bg-card p-8 md:p-12',
        isShortPunch ? 'min-h-[18rem]' : 'min-h-[14rem]',
        className,
      )}
    >
      <div className="absolute right-4 top-4 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {asset.function.replace(/_/g, ' ').toLowerCase()}
      </div>
      <blockquote
        className={cn(
          'font-display text-balance text-foreground',
          isShortPunch && 'text-4xl leading-tight md:text-6xl lg:text-7xl',
          isLongForm && 'text-lg leading-relaxed md:text-xl',
          !isShortPunch && !isLongForm && 'text-2xl md:text-3xl',
        )}
      >
        {isShortPunch ? text : <p className="max-w-prose text-pretty">{text}</p>}
      </blockquote>
      {asset.format && (
        <p className="mt-6 font-mono text-xs uppercase tracking-wider text-muted-foreground">
          {asset.format}
        </p>
      )}
    </div>
  );
}

function ImageAsset({
  asset,
  className,
  priority,
  sizes,
  fill,
}: {
  asset: Asset;
  className?: string;
  priority?: boolean;
  sizes?: string;
  fill: boolean;
}) {
  if (fill) {
    return (
      <Image
        src={asset.url}
        alt={asset.alt ?? asset.caption ?? ''}
        fill
        priority={priority}
        sizes={sizes ?? '100vw'}
        className={cn('object-cover', className)}
      />
    );
  }
  return (
    <div
      className={cn(
        'relative w-full overflow-hidden bg-muted',
        ASPECT_CLASS[asset.aspectRatio],
        className,
      )}
    >
      <Image
        src={asset.url}
        alt={asset.alt ?? asset.caption ?? ''}
        fill
        priority={priority}
        sizes={sizes ?? '(max-width: 768px) 100vw, 50vw'}
        className="object-cover"
      />
    </div>
  );
}

function VideoAsset({ asset, className }: { asset: Asset; className?: string }) {
  const [playing, setPlaying] = useState(false);

  if (!playing && asset.posterUrl) {
    return (
      <div
        className={cn(
          'group relative w-full overflow-hidden bg-muted',
          ASPECT_CLASS[asset.aspectRatio],
          className,
        )}
      >
        <Image
          src={asset.posterUrl}
          alt={asset.alt ?? asset.caption ?? ''}
          fill
          sizes="(max-width: 768px) 100vw, 80vw"
          className="object-cover"
        />
        <button
          type="button"
          onClick={() => setPlaying(true)}
          className="absolute inset-0 flex items-center justify-center bg-black/20 transition-colors hover:bg-black/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          aria-label={`Play ${asset.caption ?? 'video'}`}
        >
          <PlayCircle
            className="h-20 w-20 text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.5)] transition-transform group-hover:scale-110"
            aria-hidden
          />
        </button>
        {asset.durationSec && (
          <div className="absolute bottom-3 right-3 rounded-md bg-black/80 px-2 py-1 font-mono text-xs text-white">
            {formatDuration(asset.durationSec)}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative w-full overflow-hidden bg-black',
        ASPECT_CLASS[asset.aspectRatio],
        className,
      )}
    >
      {/** biome-ignore lint/a11y/useMediaCaption: caption is contextual in the surrounding UI */}
      <video
        src={asset.url}
        controls
        autoPlay
        playsInline
        poster={asset.posterUrl}
        className="h-full w-full"
      >
        Your browser does not support video playback.
      </video>
    </div>
  );
}

function AudioAsset({ asset, className }: { asset: Asset; className?: string }) {
  return (
    <div
      className={cn(
        'flex flex-col items-stretch justify-center gap-3 rounded-lg border border-border bg-card p-6',
        className,
      )}
    >
      <p className="text-xs uppercase tracking-wider text-muted-foreground">
        Audio · {asset.format ?? 'Recording'}
      </p>
      {/** biome-ignore lint/a11y/useMediaCaption: caption is contextual in the surrounding UI */}
      <audio controls src={asset.url} className="w-full">
        Your browser does not support audio playback.
      </audio>
      {asset.caption && (
        <p className="text-sm text-muted-foreground">{asset.caption}</p>
      )}
    </div>
  );
}

function YouTubeEmbed({ asset, className }: { asset: Asset; className?: string }) {
  return (
    <div
      className={cn(
        'relative w-full overflow-hidden bg-black',
        ASPECT_CLASS[asset.aspectRatio],
        className,
      )}
    >
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${asset.url}?rel=0`}
        title={asset.caption ?? 'Video'}
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="absolute inset-0 h-full w-full"
      />
    </div>
  );
}

function VimeoEmbed({ asset, className }: { asset: Asset; className?: string }) {
  return (
    <div
      className={cn(
        'relative w-full overflow-hidden bg-black',
        ASPECT_CLASS[asset.aspectRatio],
        className,
      )}
    >
      <iframe
        src={`https://player.vimeo.com/video/${asset.url}?title=0&byline=0&portrait=0`}
        title={asset.caption ?? 'Video'}
        loading="lazy"
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
        className="absolute inset-0 h-full w-full"
      />
    </div>
  );
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
