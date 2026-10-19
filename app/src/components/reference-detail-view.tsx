import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { AssetGallery } from './asset-gallery';
import { AssetLayout } from './asset-layout';
import { AxisDisplay } from './axis-display';
import { ConfidenceIndicator } from './confidence-indicator';
import { PerformanceCard } from './performance-card';
import { Badge } from './ui/badge';
import { ReferenceActions } from './reference-actions';
import { Container } from './ui/container';
import { Separator } from './ui/separator';
import { VictoryBadge } from './victory-badge';
import {
  MANIPULATION_MODE_DESCRIPTIONS,
  MANIPULATION_MODE_LABELS,
  PATTERN_KIND_LABELS,
  PILLAR_LABELS,
} from '@/lib/taxonomy';
import { type Reference, getHeroAsset, getMetricsForAsset } from '@/lib/types';

interface ReferenceDetailViewProps {
  reference: Reference;
}

export function ReferenceDetailView({ reference }: ReferenceDetailViewProps) {
  const hero = getHeroAsset(reference);
  const supportingAssets = reference.assets.filter((a) => a.role !== 'HERO');

  return (
    <article>
      <Container size="xl" className="pt-8 pb-12">
        <Breadcrumb reference={reference} />

        <header className="mt-6 grid gap-8 lg:grid-cols-[2fr_1fr] lg:items-end">
          <div>
            {reference.victoryTypes.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {reference.victoryTypes.map((v) => (
                  <VictoryBadge key={v} type={v} />
                ))}
              </div>
            )}
            <h1 className="mt-4 font-display text-4xl text-balance md:text-5xl lg:text-6xl">
              {reference.title}
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-muted-foreground text-pretty">
              {reference.summary}
            </p>
          </div>

          <ReferenceActions reference={reference} />
        </header>

        {hero && (
          <section className="mt-10">
            <AssetLayout asset={hero} />
            <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2 text-sm">
              <div className="flex items-center gap-3">
                {hero.format && (
                  <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                    {hero.format}
                  </span>
                )}
                {hero.caption && (
                  <span className="text-muted-foreground">{hero.caption}</span>
                )}
              </div>
              <Badge variant="outline" className="text-[10px]">
                Hero
              </Badge>
            </div>
          </section>
        )}
      </Container>

      <Container size="xl" className="pb-16">
        <div className="grid gap-12 lg:grid-cols-[1fr_320px]">
          <div className="space-y-12">
            <PerformanceCard reference={reference} />

            {supportingAssets.length > 0 && (
              <Section
                title="Assets in this operation"
                eyebrow={`${reference.assets.length} assets · ${supportingAssets.length} supporting`}
              >
                <AssetGallery assets={supportingAssets} reference={reference} />
              </Section>
            )}

            {reference.patternObservation && (
              <Section title="Pattern observation">
                <p className="editorial-prose">{reference.patternObservation}</p>
              </Section>
            )}

            <Section
              title="Structural axes"
              eyebrow={`${reference.axes.length} axes attributed`}
            >
              <div className="mt-2 grid gap-6 sm:grid-cols-2">
                {reference.axes.map((axis) => (
                  <AxisDisplay key={axis.name} axis={axis} />
                ))}
              </div>
            </Section>

            {reference.significance && (
              <Section title="Significance">
                <p className="editorial-prose">{reference.significance}</p>
              </Section>
            )}

            {reference.filiations && reference.filiations.length > 0 && (
              <Section title="Filiations">
                <ul className="space-y-3">
                  {reference.filiations.map((f) => (
                    <li
                      key={f.refId}
                      className="flex items-center justify-between rounded-md border border-border bg-card px-4 py-3"
                    >
                      <span className="flex items-center gap-3">
                        <Badge variant="ghost" className="text-[10px]">
                          {f.type === 'inspires' ? 'Inspires' : 'Inspired by'}
                        </Badge>
                        <span className="text-sm">{f.refTitle}</span>
                      </span>
                      <Link
                        href={`/work/${f.refId}`}
                        className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
                      >
                        Open <ArrowUpRight className="h-3 w-3" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </Section>
            )}
          </div>

          <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            <SidebarSection title="Pillars">
              <div className="flex flex-wrap gap-1.5">
                {reference.pillars.map((p) => (
                  <Badge key={p} variant="outline" className="font-mono text-[10px]">
                    {p} · {PILLAR_LABELS[p]}
                  </Badge>
                ))}
              </div>
            </SidebarSection>

            <SidebarSection title="Manipulation mode">
              <p className="text-sm font-medium">
                {MANIPULATION_MODE_LABELS[reference.manipulationMode]}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {MANIPULATION_MODE_DESCRIPTIONS[reference.manipulationMode]}
              </p>
            </SidebarSection>

            <SidebarSection title="Metadata">
              <dl className="space-y-2 text-xs">
                <Row label="Pattern kind">
                  {PATTERN_KIND_LABELS[reference.patternKind]}
                </Row>
                <Row label="Confidence">
                  <ConfidenceIndicator level={reference.confidence} showLabel />
                </Row>
                <Row label="Asset count">{reference.assets.length}</Row>
                <Row label="Reference ID">
                  <code className="font-mono text-[10px]">{reference.id}</code>
                </Row>
              </dl>
            </SidebarSection>
          </aside>
        </div>
      </Container>
    </article>
  );
}

function Breadcrumb({ reference }: { reference: Reference }) {
  const sectorSlug = reference.sector.toLowerCase().replace(/\s+/g, '-');
  const brandSlug = reference.brandEmitter.toLowerCase().replace(/\s+/g, '-');
  return (
    <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground">
      <ol className="flex flex-wrap items-center gap-1">
        <li>
          <Link href={`/sector/${sectorSlug}`} className="transition-colors hover:text-foreground">
            {reference.sector}
          </Link>
        </li>
        <li aria-hidden>·</li>
        <li>
          <Link href={`/brand/${brandSlug}`} className="transition-colors hover:text-foreground">
            {reference.brandEmitter}
          </Link>
        </li>
        {reference.agencyCreator && (
          <>
            <li aria-hidden>·</li>
            <li>{reference.agencyCreator}</li>
          </>
        )}
        <li aria-hidden>·</li>
        <li>{reference.marketPrimary}</li>
        <li aria-hidden>·</li>
        <li>{reference.emissionYear}</li>
      </ol>
    </nav>
  );
}

function Section({
  title,
  eyebrow,
  children,
}: { title: string; eyebrow?: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-2xl tracking-tight">{title}</h2>
        {eyebrow && (
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            {eyebrow}
          </p>
        )}
      </div>
      <Separator className="mt-3 mb-6" />
      {children}
    </section>
  );
}

function SidebarSection({
  title,
  children,
}: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <h3 className="mb-4 text-xs uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      {children}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-right">{children}</dd>
    </div>
  );
}

// Helper exported in case other views need it
export { getMetricsForAsset };
