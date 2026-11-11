import { type CSSProperties, createElement } from 'react';
import { freshness } from '@/lib/freshness';

/**
 * A stored date as <time>. Renders nothing when the data carries no date, and the raw stored
 * text (without a machine date) when it cannot be read as one: never a substituted date.
 * Written with createElement, like JsonLd, so the server-render tests can import it directly.
 */
export function FreshTime({ value, prefix, className, style }: {
  value: string | null | undefined;
  prefix?: string;
  className?: string;
  style?: CSSProperties;
}) {
  if (!value) return null;
  const date = freshness(value);
  return createElement('span', { className, style },
    prefix ? `${prefix} ` : '',
    date ? createElement('time', { dateTime: date.dateTime }, date.label) : value);
}
