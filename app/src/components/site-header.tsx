'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Mail } from 'lucide-react';

export function SiteHeader() {
  const pathname = usePathname();

  const nav = [
    { label: 'Découvrir', href: '/', match: (p: string) => p === '/' || p === '/browse' },
    { label: 'Assets', href: '/assets', match: (p: string) => p.startsWith('/assets') || p.startsWith('/asset/') },
    { label: 'Patterns', href: '/patterns', match: (p: string) => p.startsWith('/patterns') },
    { label: 'À propos', href: '/about', match: (p: string) => p.startsWith('/about') },
  ];

  return (
    <header className="topbar">
      <Link href="/" className="brand" aria-label="Argos — accueil">
        <span className="mk" aria-hidden />
        <span className="nm">Argos</span>
      </Link>
      <nav className="nav-pill" aria-label="Navigation principale">
        {nav.map((item) => {
          const active = item.match(pathname);
          return (
            <Link
              key={item.label}
              href={item.href}
              className={active ? 'on' : ''}
              // "page" for the link to this very page, "true" for its section (e.g. /asset/… under Assets)
              aria-current={active ? (pathname === item.href ? 'page' : 'true') : undefined}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="top-r">
        <div className="live">
          <span className="d" aria-hidden />
          Bibliothèque éditoriale
        </div>
        <Link href="/sign-in" className="newsletter-btn" aria-label="S'inscrire à la newsletter">
          <Mail size={13} strokeWidth={2} aria-hidden />
          Newsletter
        </Link>
      </div>
    </header>
  );
}
