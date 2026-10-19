import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { EntityPageShell } from '@/components/entity-page-shell';
import {
  ASSET_FUNCTION_LABELS,
  MANIPULATION_MODE_DESCRIPTIONS,
  MANIPULATION_MODE_LABELS,
  OPERATION_GOAL_LABELS,
  PATTERN_KIND_LABELS,
  PILLAR_LABELS,
  STRUCTURAL_AXIS_LABELS,
} from '@/lib/taxonomy';
import { getReferencesByAssetFunction, getReferencesByAxis, getReferencesByManipulationMode, getReferencesByOperationGoal, getReferencesByPatternKind, getReferencesByPillar, slugify } from '@/lib/library';
import type {
  AssetFunction,
  ManipulationMode,
  OperationGoal,
  PatternKind,
  Pillar,
  Reference,
  StructuralAxisName,
} from '@/lib/types';

// Canonical library data changes after admission; never freeze its identities at build time.
export const dynamic = 'force-dynamic';

interface ByPageProps {
  params: Promise<{ dimension: string; value: string }>;
}

const VALID_DIMENSIONS = [
  'manipulation-mode',
  'axis',
  'pattern-kind',
  'asset-function',
  'operation-goal',
  'pillar',
] as const;

type Dim = (typeof VALID_DIMENSIONS)[number];

const DIM_LABEL: Record<Dim, string> = {
  'manipulation-mode': 'Posture (manipulation)',
  axis: 'Axe structurel',
  'pattern-kind': 'Pattern kind',
  'asset-function': 'Fonction d\'asset',
  'operation-goal': 'Objectif d\'opération',
  pillar: 'Pilier',
};

export async function generateMetadata({ params }: ByPageProps): Promise<Metadata> {
  const { dimension, value } = await params;
  if (!VALID_DIMENSIONS.includes(dimension as Dim)) return { title: 'Introuvable' };
  const resolved = await resolve(dimension as Dim, value);
  if (!resolved) return { title: 'Introuvable' };
  return {
    title: `${resolved.label} — ${DIM_LABEL[dimension as Dim]}`,
    description: `Opérations d'Argos illustrant la dimension ${DIM_LABEL[dimension as Dim].toLowerCase()} : ${resolved.label}.`,
  };
}

export default async function ByPage({ params }: ByPageProps) {
  const { dimension, value } = await params;
  if (!VALID_DIMENSIONS.includes(dimension as Dim)) notFound();

  const resolved = await resolve(dimension as Dim, value);
  if (!resolved) notFound();

  if (resolved.references.length === 0) notFound();

  const subtitle = resolved.subtitle ?? '';

  return (
    <EntityPageShell
      eyebrow={DIM_LABEL[dimension as Dim]}
      name={resolved.label}
      description={subtitle}
      stats={[{ label: 'Opérations', value: resolved.references.length }]}
      references={resolved.references}
    />
  );
}

interface Resolved {
  label: string;
  subtitle?: string;
  references: Reference[];
}

async function resolve(dim: Dim, slug: string): Promise<Resolved | undefined> {
  switch (dim) {
    case 'manipulation-mode': {
      const value = (Object.keys(MANIPULATION_MODE_LABELS) as ManipulationMode[]).find(
        (m) => slugify(m) === slug,
      );
      if (!value) return undefined;
      return {
        label: MANIPULATION_MODE_LABELS[value],
        subtitle: MANIPULATION_MODE_DESCRIPTIONS[value],
        references: await getReferencesByManipulationMode(value),
      };
    }
    case 'axis': {
      const value = (Object.keys(STRUCTURAL_AXIS_LABELS) as StructuralAxisName[]).find(
        (a) => slugify(a) === slug,
      );
      if (!value) return undefined;
      return {
        label: STRUCTURAL_AXIS_LABELS[value],
        references: await getReferencesByAxis(value),
      };
    }
    case 'pattern-kind': {
      const value = (Object.keys(PATTERN_KIND_LABELS) as PatternKind[]).find(
        (k) => slugify(k) === slug,
      );
      if (!value) return undefined;
      return {
        label: PATTERN_KIND_LABELS[value],
        references: await getReferencesByPatternKind(value),
      };
    }
    case 'asset-function': {
      const value = (Object.keys(ASSET_FUNCTION_LABELS) as AssetFunction[]).find(
        (f) => slugify(f) === slug,
      );
      if (!value) return undefined;
      return {
        label: ASSET_FUNCTION_LABELS[value],
        references: await getReferencesByAssetFunction(value),
      };
    }
    case 'operation-goal': {
      const value = (Object.keys(OPERATION_GOAL_LABELS) as OperationGoal[]).find(
        (g) => slugify(g) === slug,
      );
      if (!value) return undefined;
      return {
        label: OPERATION_GOAL_LABELS[value],
        references: await getReferencesByOperationGoal(value),
      };
    }
    case 'pillar': {
      const pillarKey = slug.toUpperCase() as Pillar;
      if (!(pillarKey in PILLAR_LABELS)) return undefined;
      return {
        label: `${pillarKey} · ${PILLAR_LABELS[pillarKey]}`,
        references: await getReferencesByPillar(pillarKey),
      };
    }
  }
}
