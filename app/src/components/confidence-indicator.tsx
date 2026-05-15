import { cn } from '@/lib/utils';
import type { ConfidenceLevel } from '@/lib/types';

const CONFIDENCE_STYLES: Record<ConfidenceLevel, { dot: string; label: string }> = {
  HIGH: { dot: 'bg-success', label: 'High confidence' },
  MEDIUM: { dot: 'bg-warning', label: 'Medium confidence' },
  LOW: { dot: 'bg-destructive', label: 'Low confidence' },
  ESTIMATED: { dot: 'bg-muted-foreground', label: 'Estimated' },
};

interface ConfidenceIndicatorProps {
  level: ConfidenceLevel;
  showLabel?: boolean;
  className?: string;
}

export function ConfidenceIndicator({
  level,
  showLabel = false,
  className,
}: ConfidenceIndicatorProps) {
  const style = CONFIDENCE_STYLES[level];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-xs text-muted-foreground',
        className,
      )}
      title={style.label}
    >
      <span aria-hidden className={cn('inline-block h-2 w-2 rounded-full', style.dot)} />
      {showLabel && <span>{style.label}</span>}
    </span>
  );
}
