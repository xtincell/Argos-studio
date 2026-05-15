'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface FilterGroup {
  label: string;
  key: string;
  options: { value: string; label: string; count?: number }[];
}

interface FilterSidebarProps {
  groups?: FilterGroup[];
  className?: string;
}

const DEFAULT_GROUPS: FilterGroup[] = [
  {
    label: 'Sector',
    key: 'sector',
    options: [
      { value: 'sportswear', label: 'Sportswear', count: 412 },
      { value: 'telecommunications', label: 'Telecommunications', count: 287 },
      { value: 'technology', label: 'Technology', count: 519 },
      { value: 'spirits', label: 'Spirits', count: 184 },
      { value: 'banking', label: 'Banking', count: 326 },
      { value: 'fashion', label: 'Fashion', count: 472 },
    ],
  },
  {
    label: 'Market',
    key: 'market',
    options: [
      { value: 'nigeria', label: 'Nigeria', count: 137 },
      { value: 'cote-divoire', label: "Côte d'Ivoire", count: 89 },
      { value: 'senegal', label: 'Sénégal', count: 64 },
      { value: 'kenya', label: 'Kenya', count: 102 },
      { value: 'south-africa', label: 'South Africa', count: 198 },
      { value: 'france', label: 'France', count: 471 },
      { value: 'usa', label: 'United States', count: 2841 },
    ],
  },
  {
    label: 'Pattern kind',
    key: 'patternKind',
    options: [
      { value: 'IMAGE', label: 'Image', count: 8932 },
      { value: 'VIDEO', label: 'Video', count: 6471 },
      { value: 'BRAND_SYSTEM', label: 'Brand system', count: 412 },
      { value: 'MIXED', label: 'Mixed', count: 3210 },
      { value: 'DIGITAL_INTERACTION', label: 'Digital interaction', count: 1834 },
    ],
  },
  {
    label: 'Manipulation mode',
    key: 'manipulationMode',
    options: [
      { value: 'FACILITATOR', label: 'Facilitator', count: 7211 },
      { value: 'ENTERTAINER', label: 'Entertainer', count: 8943 },
      { value: 'DEALER', label: 'Dealer', count: 5612 },
      { value: 'PEDDLER', label: 'Peddler', count: 4982 },
    ],
  },
];

export function FilterSidebar({ groups = DEFAULT_GROUPS, className }: FilterSidebarProps) {
  const [active, setActive] = useState<Record<string, Set<string>>>(() =>
    Object.fromEntries(groups.map((g) => [g.key, new Set<string>()])),
  );

  function toggle(groupKey: string, value: string) {
    setActive((prev) => {
      const next = { ...prev };
      const set = new Set(prev[groupKey]);
      if (set.has(value)) set.delete(value);
      else set.add(value);
      next[groupKey] = set;
      return next;
    });
  }

  const totalActive = Object.values(active).reduce(
    (sum, set) => sum + set.size,
    0,
  );

  return (
    <aside
      aria-label="Search filters"
      className={cn('sticky top-20 max-h-[calc(100vh-5rem)] overflow-auto', className)}
    >
      <div className="flex items-center justify-between pb-4">
        <h2 className="font-display text-lg">Filters</h2>
        {totalActive > 0 && (
          <button
            type="button"
            onClick={() =>
              setActive(
                Object.fromEntries(groups.map((g) => [g.key, new Set<string>()])),
              )
            }
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Clear ({totalActive})
          </button>
        )}
      </div>
      <div className="space-y-6">
        {groups.map((group) => {
          const groupActive = active[group.key] ?? new Set<string>();
          return (
            <div key={group.key}>
              <h3 className="mb-3 text-xs uppercase tracking-wider text-muted-foreground">
                {group.label}
              </h3>
              <ul className="space-y-1.5">
                {group.options.map((opt) => {
                  const isActive = groupActive.has(opt.value);
                  return (
                    <li key={opt.value}>
                      <button
                        type="button"
                        onClick={() => toggle(group.key, opt.value)}
                        className={cn(
                          'flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors',
                          isActive
                            ? 'bg-accent/15 text-accent-foreground'
                            : 'text-foreground/80 hover:bg-muted hover:text-foreground',
                        )}
                        aria-pressed={isActive}
                      >
                        <span className="flex items-center gap-2">
                          <span
                            aria-hidden
                            className={cn(
                              'inline-block h-3.5 w-3.5 rounded border transition-colors',
                              isActive
                                ? 'border-accent bg-accent'
                                : 'border-border',
                            )}
                          />
                          {opt.label}
                        </span>
                        {typeof opt.count === 'number' && (
                          <Badge variant="ghost" className="text-[10px]">
                            {opt.count.toLocaleString()}
                          </Badge>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
              <Separator className="mt-6" />
            </div>
          );
        })}
      </div>
    </aside>
  );
}
