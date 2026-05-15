import { formatCompact, formatRelativeTime } from '@/lib/utils';

interface Stat {
  label: string;
  value: string | number;
  format?: 'number' | 'text';
}

interface LiveStatsProps {
  references: number;
  markets: number;
  brands: number;
  lastUpdate: Date;
}

export function LiveStats({ references, markets, brands, lastUpdate }: LiveStatsProps) {
  const stats: Stat[] = [
    { label: 'Campaigns indexed', value: formatCompact(references) },
    { label: 'Markets covered', value: markets },
    { label: 'Brands tracked', value: formatCompact(brands) },
    { label: 'Last update', value: formatRelativeTime(lastUpdate), format: 'text' },
  ];
  return (
    <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm sm:grid-cols-4">
      {stats.map((stat) => (
        <div key={stat.label} className="flex flex-col">
          <span className="font-display text-2xl text-foreground">{stat.value}</span>
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            {stat.label}
          </span>
        </div>
      ))}
    </div>
  );
}
