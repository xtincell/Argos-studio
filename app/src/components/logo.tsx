import Link from 'next/link';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  href?: string;
  showWordmark?: boolean;
}

export function Logo({ className, href = '/', showWordmark = true }: LogoProps) {
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex items-center gap-2 font-display text-lg tracking-tight transition-opacity hover:opacity-80',
        className,
      )}
      aria-label="Argos — home"
    >
      <LogoMark className="h-7 w-7" />
      {showWordmark && <span className="font-semibold">Argos</span>}
    </Link>
  );
}

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden
      role="presentation"
    >
      <title>Argos logo</title>
      <circle cx="16" cy="16" r="15" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="16" cy="16" r="3" fill="hsl(var(--accent))" />
      <circle cx="16" cy="16" r="9" stroke="currentColor" strokeWidth="1" opacity="0.5" />
    </svg>
  );
}
