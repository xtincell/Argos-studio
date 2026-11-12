// Explicit change of a dossier's visibility (ADR-0010). Only the administration key reaches this
// module (route guarded by requireAdmin). Publication (private → public) applies the admission
// rules to the stored canonical dossier: a dossier that would be refused today is not published.
// A change keeps `updatedAt` (the content version, its ETag) and records when and by which
// channel of the key it was made, on the reference and in its append-only history.

import { prisma } from '@/lib/db';
import { ResearchDossierSchema } from '@/lib/research-dossier';
import type { AdminChannel, Visibility } from '@/lib/visibility';

export interface VisibilityReceipt {
  slug: string;
  visibility: Visibility;
  changed: boolean;
  changedAt: string | null;
  changedBy: string | null;
  updatedAt: string;
}

export class VisibilityError extends Error {
  constructor(
    readonly code: 'NOT_FOUND' | 'VERSION_CONFLICT' | 'PUBLICATION_REFUSED',
    message: string,
    readonly issues: { path: string; message: string }[] = [],
  ) {
    super(message);
  }
}

/** Why the stored dossier cannot be published, or null when the admission rules accept it. */
function publicationRefusal(sourceDossierJson: string | null): VisibilityError | null {
  if (!sourceDossierJson) {
    return new VisibilityError('PUBLICATION_REFUSED',
      'Le dossier d’origine de cette référence n’est pas conservé : admettez-le à nouveau avant de le publier.');
  }
  let raw: unknown;
  try {
    raw = JSON.parse(sourceDossierJson);
  } catch {
    return new VisibilityError('PUBLICATION_REFUSED', 'Le dossier conservé est illisible : admettez-le à nouveau avant de le publier.');
  }
  const parsed = ResearchDossierSchema.safeParse(raw);
  if (parsed.success) return null;
  return new VisibilityError('PUBLICATION_REFUSED',
    'Le dossier conservé ne respecte plus les règles d’admission : corrigez-le avant de le publier.',
    parsed.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })));
}

export async function changeVisibility(input: {
  slug: string;
  visibility: Visibility;
  channel: AdminChannel;
  /** Content version the administrator saw (ISO `updatedAt`); a different one is refused. */
  expectedUpdatedAt?: string;
}): Promise<VisibilityReceipt> {
  return prisma.$transaction(async (tx) => {
    const row = await tx.reference.findUnique({
      where: { slug: input.slug },
      select: { id: true, slug: true, visibility: true, updatedAt: true, visibilityChangedAt: true,
        visibilityChangedBy: true, sourceDossierJson: true },
    });
    if (!row) throw new VisibilityError('NOT_FOUND', `Aucune référence « ${input.slug} ».`);
    const current: Visibility = row.visibility === 'private' ? 'private' : 'public';
    if (input.expectedUpdatedAt !== undefined && row.updatedAt.toISOString() !== input.expectedUpdatedAt) {
      throw new VisibilityError('VERSION_CONFLICT', 'La référence a changé depuis son affichage. Rechargez-la avant de changer sa visibilité.');
    }
    const receipt = (changed: boolean, changedAt: Date | null, changedBy: string | null): VisibilityReceipt => ({
      slug: row.slug, visibility: changed ? input.visibility : current, changed,
      changedAt: changedAt?.toISOString() ?? null, changedBy, updatedAt: row.updatedAt.toISOString(),
    });
    if (current === input.visibility) return receipt(false, row.visibilityChangedAt, row.visibilityChangedBy);
    if (input.visibility === 'public') {
      const refusal = publicationRefusal(row.sourceDossierJson);
      if (refusal) throw refusal;
    }
    const changedAt = new Date();
    // Conditional write: a concurrent amendment or change between read and write is refused.
    const written = await tx.reference.updateMany({
      where: { id: row.id, visibility: current, updatedAt: row.updatedAt },
      data: { visibility: input.visibility, visibilityChangedAt: changedAt, visibilityChangedBy: input.channel,
        updatedAt: row.updatedAt },
    });
    if (written.count !== 1) {
      throw new VisibilityError('VERSION_CONFLICT', 'La référence a changé pendant l’opération. Rechargez-la avant de changer sa visibilité.');
    }
    await tx.visibilityChange.create({
      data: { referenceId: row.id, fromVisibility: current, toVisibility: input.visibility, changedAt, changedBy: input.channel },
    });
    return receipt(true, changedAt, input.channel);
  });
}
