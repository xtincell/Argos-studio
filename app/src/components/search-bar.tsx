'use client';

import { Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type FormEvent, useId, useState } from 'react';
import { cn } from '@/lib/utils';

interface SearchBarProps {
  initialQuery?: string;
  placeholder?: string;
  size?: 'md' | 'lg';
  autoFocus?: boolean;
  className?: string;
}

const SIZE_STYLES: Record<NonNullable<SearchBarProps['size']>, string> = {
  md: 'h-12 text-base pl-12 pr-4',
  lg: 'h-16 text-lg pl-14 pr-5',
};

const ICON_SIZE: Record<NonNullable<SearchBarProps['size']>, string> = {
  md: 'h-5 w-5 left-4',
  lg: 'h-6 w-6 left-5',
};

export function SearchBar({
  initialQuery = '',
  placeholder = 'Search 27,432 campaigns by brand, market, agency, or pattern…',
  size = 'lg',
  autoFocus,
  className,
}: SearchBarProps) {
  const [query, setQuery] = useState(initialQuery);
  const router = useRouter();
  const inputId = useId();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <form
      onSubmit={handleSubmit}
      role="search"
      aria-label="Argos search"
      className={cn('relative w-full', className)}
    >
      <label htmlFor={inputId} className="sr-only">
        Search references
      </label>
      <Search
        aria-hidden
        className={cn(
          'pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted-foreground',
          ICON_SIZE[size],
        )}
      />
      <input
        id={inputId}
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className={cn(
          'w-full rounded-full border border-border bg-card text-foreground shadow-sm transition-all',
          'placeholder:text-muted-foreground',
          'focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
          SIZE_STYLES[size],
        )}
      />
    </form>
  );
}
