import { Award, Flame, Sparkles, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { VICTORY_LABELS } from '@/lib/taxonomy';
import type { VictoryType } from '@/lib/types';

interface VictoryBadgeProps {
  type: VictoryType;
}

const AWARDS: VictoryType[] = [
  'CANNES_LIONS_GOLD',
  'CANNES_LIONS_SILVER',
  'CANNES_LIONS_BRONZE',
  'DANDAD_PENCIL',
  'EFFIE_GOLD',
  'LOERIES_GRAND_PRIX',
  'PIKINE_GRAND_PRIX',
];

const VIRALS: VictoryType[] = ['VIRAL_REACH', 'CULT_STATUS_DOCUMENTED'];

const COMMERCIAL: VictoryType[] = [
  'COMMERCIAL_IMPACT_PROVEN',
  'LOCAL_DOMINANCE_PROVEN',
];

export function VictoryBadge({ type }: VictoryBadgeProps) {
  const isAward = AWARDS.includes(type);
  const isViral = VIRALS.includes(type);
  const isCommercial = COMMERCIAL.includes(type);

  const Icon = isAward ? Award : isViral ? Flame : isCommercial ? TrendingUp : Sparkles;
  const variant = isAward ? 'accent' : isViral ? 'warning' : 'outline';

  return (
    <Badge variant={variant} className="gap-1">
      <Icon className="h-3 w-3" aria-hidden />
      {VICTORY_LABELS[type]}
    </Badge>
  );
}
