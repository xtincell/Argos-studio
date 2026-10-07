import { createElement } from 'react';

/** Dossier text must remain JSON data even when it contains a script terminator. */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return createElement('script', { type: 'application/ld+json' },
    JSON.stringify(data).replace(/</g, '\\u003c'));
}
