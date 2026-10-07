import { Globe, Lock, MapPin, Wifi } from 'lucide-react';
import { MediaPlayer } from './media-player';
import type { Asset } from '@/lib/types';
import { cn } from '@/lib/utils';

interface AssetLayoutProps {
  asset: Asset;
  className?: string;
  /** When true, the layout chrome is rendered around the media. Default true. */
  chrome?: boolean;
}

/**
 * AssetLayout wraps MediaPlayer with chrome that matches the asset's marketing function.
 * The chrome ISN'T decoration — it makes the asset readable in its native context :
 *   - A REEL renders in an iPhone frame so the DA sees how the safe zones land
 *   - An OOH renders in a billboard frame with dimension + location stamped
 *   - A WEBSITE renders in a browser frame with the URL bar
 *   - A TAGLINE / MANIFESTO renders bare (its layout IS the chrome)
 */
export function AssetLayout({ asset, className, chrome = true }: AssetLayoutProps) {
  if (!chrome) return <MediaPlayer asset={asset} className={className} />;

  switch (asset.function) {
    // Mobile-vertical contexts get a device frame
    case 'REEL':
    case 'STORY':
    case 'TIKTOK_NATIVE':
    case 'SOCIAL_POST_VIDEO':
      return <MobileFrame asset={asset} className={className} />;

    // Out-of-home gets a billboard frame with placement stamp
    case 'OOH_BILLBOARD':
    case 'OOH_DIGITAL':
    case 'OOH_TRANSIT':
      return <BillboardFrame asset={asset} className={className} />;

    // Print and posters get a paper frame
    case 'PRINT_AD':
    case 'POSTER':
      return <PrintFrame asset={asset} className={className} />;

    // Web surfaces get a browser frame
    case 'WEBSITE_PAGE':
    case 'LANDING_PAGE':
    case 'MICROSITE':
      return <BrowserFrame asset={asset} className={className} />;

    // App screens get a mobile frame, status bar visible
    case 'APP_SCREEN':
      return <MobileFrame asset={asset} className={className} showStatusBar />;

    // Audio gets a waveform panel
    case 'JINGLE':
    case 'SOUND_LOGO':
    case 'RADIO_SPOT':
    case 'PODCAST_EPISODE':
      return <AudioPanel asset={asset} className={className} />;

    // Packaging stages the product
    case 'PACKAGING':
      return <ProductStage asset={asset} className={className} />;

    // Everything else (TAGLINE, MANIFESTO, TVC, KEY_VISUAL, KEY_FRAME, BODY_COPY,
    // LOGO_LOCKUP, ACTIVATION_PHOTO, etc.) renders bare — the MediaPlayer is enough.
    default:
      return <MediaPlayer asset={asset} className={className} />;
  }
}

/* -------------------------------------------------------------------------- */
/* Layouts                                                                     */
/* -------------------------------------------------------------------------- */

function MobileFrame({
  asset,
  className,
  showStatusBar = false,
}: {
  asset: Asset;
  className?: string;
  showStatusBar?: boolean;
}) {
  return (
    <div className={cn('mx-auto w-full max-w-[280px]', className)}>
      <div className="relative overflow-hidden rounded-[2.25rem] border-[10px] border-foreground/10 bg-foreground/5 shadow-2xl ring-1 ring-foreground/10">
        {showStatusBar && (
          <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-5 py-2 text-[10px] font-medium text-white mix-blend-difference">
            <span>9:41</span>
            <span className="flex items-center gap-1">
              <Wifi className="h-3 w-3" aria-hidden />
              <span className="h-2.5 w-5 rounded-sm border border-white">
                <span className="block h-full w-full rounded-sm bg-white" />
              </span>
            </span>
          </div>
        )}
        <div className="aspect-[9/16] w-full overflow-hidden">
          <MediaPlayer asset={asset} fill sizes="280px" />
        </div>
        <div className="absolute inset-x-0 bottom-1 flex items-center justify-center">
          <div className="h-1 w-1/3 rounded-full bg-white/60" aria-hidden />
        </div>
      </div>
      {asset.caption && (
        <p className="mt-3 text-center text-xs text-muted-foreground">{asset.caption}</p>
      )}
    </div>
  );
}

function BillboardFrame({ asset, className }: { asset: Asset; className?: string }) {
  return (
    <figure className={cn('w-full', className)}>
      <div className="relative w-full">
        <div className="relative overflow-hidden rounded-md border border-foreground/15 bg-foreground/5 shadow-xl">
          <MediaPlayer asset={asset} />
        </div>
        {/* Billboard support posts — purely visual cue */}
        <div className="mx-auto -mt-px flex w-1/2 justify-between" aria-hidden>
          <span className="h-6 w-1 bg-foreground/20" />
          <span className="h-6 w-1 bg-foreground/20" />
        </div>
        <div
          className="mx-auto h-1 w-2/3 rounded-b-full bg-gradient-to-b from-foreground/15 to-transparent"
          aria-hidden
        />
      </div>
      {(asset.format || asset.caption) && (
        <figcaption className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs">
          {asset.format && (
            <span className="inline-flex items-center gap-1 font-mono uppercase tracking-wider text-muted-foreground">
              <MapPin className="h-3 w-3" aria-hidden />
              {asset.format}
            </span>
          )}
          {asset.caption && <span className="text-muted-foreground">{asset.caption}</span>}
        </figcaption>
      )}
    </figure>
  );
}

function PrintFrame({ asset, className }: { asset: Asset; className?: string }) {
  return (
    <figure className={cn('w-full', className)}>
      <div className="relative mx-auto max-w-md">
        <div className="relative rounded-sm bg-foreground/5 p-3 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.5)] ring-1 ring-foreground/10">
          <div className="overflow-hidden rounded-[2px] bg-card">
            <MediaPlayer asset={asset} />
          </div>
          {/* Page fold cue */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-3 left-1/2 w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-foreground/10 to-transparent"
          />
        </div>
      </div>
      {(asset.format || asset.caption) && (
        <figcaption className="mt-3 text-center text-xs">
          {asset.format && (
            <p className="font-mono uppercase tracking-wider text-muted-foreground">
              {asset.format}
            </p>
          )}
          {asset.caption && <p className="mt-1 text-muted-foreground">{asset.caption}</p>}
        </figcaption>
      )}
    </figure>
  );
}

function BrowserFrame({ asset, className }: { asset: Asset; className?: string }) {
  return (
    <figure className={cn('w-full', className)}>
      <div className="overflow-hidden rounded-lg border border-foreground/15 bg-foreground/5 shadow-xl">
        <div className="flex items-center gap-2 border-b border-foreground/10 px-3 py-2">
          <span className="flex gap-1.5" aria-hidden>
            <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-green-400/70" />
          </span>
          <div className="ml-3 flex flex-1 items-center gap-1.5 rounded-md bg-background/60 px-2.5 py-1 font-mono text-[10px] text-muted-foreground">
            <Lock className="h-3 w-3" aria-hidden />
            <Globe className="h-3 w-3" aria-hidden />
            <span>{asset.format ?? 'argos.studio'}</span>
          </div>
        </div>
        <div className="overflow-hidden bg-card">
          <MediaPlayer asset={asset} />
        </div>
      </div>
      {asset.caption && (
        <figcaption className="mt-3 text-xs text-muted-foreground">{asset.caption}</figcaption>
      )}
    </figure>
  );
}

function AudioPanel({ asset, className }: { asset: Asset; className?: string }) {
  return (
    <figure className={cn('w-full', className)}>
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex items-baseline justify-between gap-3">
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {asset.format ?? 'Audio'}
          </p>
          {asset.durationSec && (
            <p className="font-mono text-[10px] text-muted-foreground">
              {asset.durationSec}s
            </p>
          )}
        </div>
        <div className="mt-4">
          <MediaPlayer asset={asset} />
        </div>
      </div>
      {asset.caption && (
        <figcaption className="mt-3 text-xs text-muted-foreground">{asset.caption}</figcaption>
      )}
    </figure>
  );
}

function ProductStage({ asset, className }: { asset: Asset; className?: string }) {
  return (
    <figure
      className={cn(
        'relative overflow-hidden rounded-lg border border-border bg-gradient-to-b from-card via-background to-background p-6',
        className,
      )}
    >
      <div className="mx-auto max-w-sm">
        <MediaPlayer asset={asset} />
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-6 bottom-3 h-8 rounded-full bg-foreground/10 blur-xl"
      />
      {(asset.format || asset.caption) && (
        <figcaption className="relative mt-4 text-center text-xs">
          {asset.format && (
            <p className="font-mono uppercase tracking-wider text-muted-foreground">
              {asset.format}
            </p>
          )}
          {asset.caption && <p className="mt-1 text-muted-foreground">{asset.caption}</p>}
        </figcaption>
      )}
    </figure>
  );
}
