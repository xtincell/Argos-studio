import { ShieldCheck, ShieldQuestion, Sparkles, TrendingUp } from 'lucide-react';
import { Badge } from './ui/badge';
import {
  ATTRIBUTION_LABELS,
  OPERATION_GOAL_LABELS,
  PERFORMANCE_METRIC_LABELS,
} from '@/lib/taxonomy';
import type {
  AttributionConfidence,
  PerformanceMetric,
  PerformanceScore,
  Reference,
} from '@/lib/types';
import { cn, formatCompact } from '@/lib/utils';
import { metricEvidenceKey } from '@/lib/types';

interface PerformanceCardProps {
  reference: Reference;
  className?: string;
}

export function PerformanceCard({ reference, className }: PerformanceCardProps) {
  const { performance } = reference;
  return (
    <section
      className={cn('rounded-lg border border-border bg-card', className)}
      aria-label="Operation performance"
    >
      <header className="border-b border-border p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Operation performance
            </p>
            <div className="mt-2 flex items-baseline gap-3">
              <span className="font-display text-5xl text-foreground">
                {performance.composite ?? "Non mesuré"}
              </span>
              {performance.composite !== null && <span className="text-sm text-muted-foreground">/100 composite</span>}
            </div>
          </div>
          <AttributionPill level={performance.overallAttribution} />
        </div>
        {performance.composite !== null && <ScoreBar value={performance.composite} className="mt-4" />}
        <p className="mt-3 text-xs text-muted-foreground">{performance.compositeSource === 'provided-by-researcher' ? 'Note déclarée par le chercheur' : performance.compositeSource === 'computed-from-metrics' ? 'Composite heuristique des métriques citées' : performance.compositeSource === 'not-measured' ? 'Aucune note ni mesure disponible' : 'Ancienne note : origine du calcul à qualifier'}</p>
        {performance.rationale && (
          <p className="mt-4 max-w-3xl text-sm text-foreground/90 leading-relaxed">
            {performance.rationale}
          </p>
        )}
        <div className="mt-5 flex flex-wrap gap-1.5">
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Primary goals
          </span>
          {performance.primaryGoals.map((g) => (
            <Badge key={g} variant="accent" className="text-[10px]">
              {OPERATION_GOAL_LABELS[g]}
            </Badge>
          ))}
          {reference.operationGoals
            .filter((g) => !performance.primaryGoals.includes(g))
            .map((g) => (
              <Badge key={g} variant="outline" className="text-[10px]">
                {OPERATION_GOAL_LABELS[g]}
              </Badge>
            ))}
        </div>
      </header>

      <div className="grid divide-y divide-border md:divide-x md:divide-y-0 md:grid-cols-2">
        <MetricGroup
          title="Operation-level metrics"
          metrics={performance.metrics.filter((m) => m.scope === 'OPERATION')}
        />
        <MetricGroup
          title="Asset-level metrics"
          metrics={performance.metrics.filter((m) => m.scope === 'ASSET')}
          showAssetPointer
          reference={reference}
          emptyMessage="No asset-level measurements recorded yet."
        />
      </div>
    </section>
  );
}

function MetricGroup({
  title,
  metrics,
  showAssetPointer = false,
  reference,
  emptyMessage,
}: {
  title: string;
  metrics: PerformanceMetric[];
  showAssetPointer?: boolean;
  reference?: Reference;
  emptyMessage?: string;
}) {
  return (
    <div className="p-6">
      <h3 className="text-xs uppercase tracking-wider text-muted-foreground">{title}</h3>
      {metrics.length === 0 ? (
        <p className="mt-4 text-sm italic text-muted-foreground">
          {emptyMessage ?? 'No metrics recorded.'}
        </p>
      ) : (
        <ul className="mt-4 space-y-4">
          {metrics.map((m) => (
            <li key={metricEvidenceKey(m)}>
              <MetricRow
                metric={m}
                referenceAsset={
                  showAssetPointer && reference
                    ? reference.assets.find((a) => a.id === m.scopedAssetId)
                    : undefined
                }
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MetricRow({
  metric,
  referenceAsset,
}: {
  metric: PerformanceMetric;
  referenceAsset?: { id: string; caption?: string; format?: string };
}) {
  const Icon = metric.kind === 'CULT_INDEX_0_100' ? Sparkles : TrendingUp;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
          <Icon className="h-3.5 w-3.5 text-accent" aria-hidden />
          {PERFORMANCE_METRIC_LABELS[metric.kind]}
        </span>
        <span className="font-display text-xl text-foreground">
          {metric.displayValue ?? defaultFormat(metric)}
        </span>
      </div>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        <span>Goal: {OPERATION_GOAL_LABELS[metric.goal]}</span>
        <AttributionTag level={metric.attribution} compact />
        <span className="truncate">Source: {metric.source}</span>
        {metric.measuredAtYearMonth && <span>· {metric.measuredAtYearMonth}</span>}
      </div>
      {referenceAsset && (
        <p className="text-[11px] text-foreground/70 italic">
          Asset: {referenceAsset.format ?? referenceAsset.caption ?? referenceAsset.id}
        </p>
      )}
    </div>
  );
}

function AttributionPill({ level }: { level: AttributionConfidence }) {
  const styles: Record<AttributionConfidence, string> = {
    PROVEN_CAUSAL: 'border-success/40 bg-success/10 text-success',
    CORRELATED: 'border-border bg-muted text-foreground/90',
    ESTIMATED: 'border-warning/40 bg-warning/10 text-warning',
    CLAIMED: 'border-destructive/40 bg-destructive/10 text-destructive',
  };
  const Icon = level === 'PROVEN_CAUSAL' ? ShieldCheck : ShieldQuestion;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-medium uppercase tracking-wider',
        styles[level],
      )}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {ATTRIBUTION_LABELS[level]}
    </span>
  );
}

function AttributionTag({
  level,
  compact = false,
}: { level: AttributionConfidence; compact?: boolean }) {
  const color: Record<AttributionConfidence, string> = {
    PROVEN_CAUSAL: 'text-success',
    CORRELATED: 'text-foreground/70',
    ESTIMATED: 'text-warning',
    CLAIMED: 'text-destructive',
  };
  return (
    <span className={cn('uppercase tracking-wider', color[level], compact && 'text-[10px]')}>
      {ATTRIBUTION_LABELS[level]}
    </span>
  );
}

function ScoreBar({ value, className }: { value: number; className?: string }) {
  return (
    <div
      role="progressbar"
      tabIndex={0}
      aria-label="Composite score"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn('h-1.5 w-full overflow-hidden rounded-full bg-muted', className)}
    >
      <div
        className="h-full bg-gradient-to-r from-accent to-accent/70"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

function defaultFormat(metric: PerformanceMetric): string {
  if (metric.kind.endsWith('_PCT')) return `${metric.value}%`;
  if (metric.kind === 'LONGEVITY_MONTHS') return `${Math.round(metric.value / 12)} yr`;
  if (metric.kind === 'REVENUE_USD') return `$${formatCompact(metric.value)}`;
  if (metric.kind === 'UNITS_SOLD' || metric.kind === 'UGC_VOLUME' || metric.kind === 'IMPRESSIONS' || metric.kind === 'REACH_PERSONS') {
    return formatCompact(metric.value);
  }
  return metric.value.toString();
}
