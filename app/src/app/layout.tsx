import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter_Tight, Instrument_Serif, JetBrains_Mono } from 'next/font/google';
import { SiteHeader } from '@/components/site-header';

const sans = Inter_Tight({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-sans',
  display: 'swap',
});

const display = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-display',
  display: 'swap',
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: {
    default: 'Argos — répertoire des opérations marketing',
    template: '%s · Argos',
  },
  description:
    "Argos indexe, qualifie et annote les opérations marketing qui ont fait école. Une bibliothèque éditoriale pour directeurs de création, planneurs stratégiques et chercheurs.",
  authors: [{ name: 'Argos Inc.' }],
  openGraph: {
    type: 'website',
    siteName: 'Argos',
    title: 'Argos — répertoire éditorial des opérations marketing',
    description:
      "Indexé, qualifié, annoté. La bibliothèque construite pour les directeurs de création et les planneurs.",
  },
  twitter: { card: 'summary_large_image', title: 'Argos' },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#efe7d4',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable} ${mono.variable}`}>
      <body>
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
