import { ConfidenceIndicator } from './confidence-indicator';
import { STRUCTURAL_AXIS_LABELS } from '@/lib/taxonomy';
import type { ConfidenceLevel, StructuralAxis } from '@/lib/types';

function confidenceToLevel(confidence: number): ConfidenceLevel {
  if (confidence >= 0.85) return 'HIGH';
  if (confidence >= 0.65) return 'MEDIUM';
  if (confidence >= 0.4) return 'LOW';
  return 'ESTIMATED';
}

interface AxisDisplayProps {
  axis: StructuralAxis;
}

export function AxisDisplay({ axis }: AxisDisplayProps) {
  return (
    <div className="space-y-2 border-l-2 border-border pl-4 transition-colors hover:border-accent/60">
      <div className="flex items-center justify-between gap-2">
        <h4 className="font-display text-base text-foreground">
          {STRUCTURAL_AXIS_LABELS[axis.name]}
        </h4>
        <ConfidenceIndicator level={confidenceToLevel(axis.confidence)} />
      </div>
      <p className="text-sm text-foreground/90 leading-relaxed">{axis.value}</p>
      {axis.evidence && (
        <p className="text-xs text-muted-foreground italic leading-relaxed">
          Evidence — {axis.evidence}
        </p>
      )}
    </div>
  );
}
