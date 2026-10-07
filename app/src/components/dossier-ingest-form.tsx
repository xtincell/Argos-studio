'use client';

import { AlertCircle, CheckCircle2, Copy, Download, FileJson, Loader2, Upload } from 'lucide-react';
import { useEffect, useId, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ReferenceDetailView } from '@/components/reference-detail-view';
import {
  dossierToReference,
  validateDossierJson,
  type TransformResult,
  type ValidationResult,
} from '@/lib/research-dossier';
import { cn } from '@/lib/utils';

type SubmitState =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'success'; slug: string; assetCount: number }
  | { kind: 'error'; message: string };

export function DossierIngestForm() {
  const inputId = useId();
  const [json, setJson] = useState('');
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [transform, setTransform] = useState<TransformResult | null>(null);
  const [submitState, setSubmitState] = useState<SubmitState>({ kind: 'idle' });

  // Validate live with a small debounce
  useEffect(() => {
    if (!json.trim()) {
      setValidation(null);
      setTransform(null);
      return;
    }
    const id = setTimeout(() => {
      const result = validateDossierJson(json);
      setValidation(result);
      if (result.ok && result.dossier) {
        try {
          setTransform(dossierToReference(result.dossier));
        } catch (err) {
          setTransform(null);
          setValidation({
            ok: false,
            errors: [{ path: '(transform)', message: err instanceof Error ? err.message : String(err) }],
          });
        }
      } else {
        setTransform(null);
      }
    }, 300);
    return () => clearTimeout(id);
  }, [json]);

  const stats = useMemo(() => {
    if (!validation?.ok || !validation.dossier) return null;
    const d = validation.dossier;
    return {
      assets: d.assets.length,
      sources: d.sources.length,
      axes: d.axes.length,
      metrics: d.performance.metrics.length,
    };
  }, [validation]);

  async function handleSubmit() {
    if (!validation?.ok || !validation.dossier) return;
    setSubmitState({ kind: 'submitting' });
    try {
      const res = await fetch('/api/v1/ingest/dossier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: json,
      });
      const data = (await res.json()) as
        | { ok: true; slug: string; assetCount: number }
        | { ok: false; error: string };
      if (!res.ok || !data.ok) {
        setSubmitState({
          kind: 'error',
          message: 'error' in data ? data.error : `HTTP ${res.status}`,
        });
        return;
      }
      setSubmitState({ kind: 'success', slug: data.slug, assetCount: data.assetCount });
    } catch (err) {
      setSubmitState({
        kind: 'error',
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  async function loadExample() {
    const res = await fetch('/dossier-example.json');
    const text = await res.text();
    setJson(text);
  }

  function copyTemplate() {
    fetch('/dossier-template.json')
      .then((r) => r.text())
      .then((t) => navigator.clipboard.writeText(t));
  }

  function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      if (typeof text === 'string') setJson(text);
    };
    reader.readAsText(file);
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
      {/* Left : input + validation */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-xl">1. Coller ou uploader le JSON du dossier</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Schema : <code className="font-mono">research-dossier-v1</code> ·{' '}
              <a href="/docs/research-dossier-spec" className="underline">
                voir la spec
              </a>
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Button variant="outline" size="sm" onClick={loadExample}>
              <FileJson className="h-3.5 w-3.5" />
              Charger l'exemple
            </Button>
            <Button variant="outline" size="sm" onClick={copyTemplate}>
              <Copy className="h-3.5 w-3.5" />
              Copier le template
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href="/dossier-template.json" download>
                <Download className="h-3.5 w-3.5" />
                Télécharger le template
              </a>
            </Button>
            <label className="cursor-pointer">
              <input
                type="file"
                accept="application/json,.json"
                onChange={handleFileUpload}
                className="sr-only"
              />
              <span className="inline-flex h-8 items-center gap-2 rounded-md border border-border bg-transparent px-3 text-xs font-medium transition-colors hover:bg-muted">
                <Upload className="h-3.5 w-3.5" />
                Uploader un fichier
              </span>
            </label>
          </div>
        </div>

        <textarea
          id={inputId}
          value={json}
          onChange={(e) => setJson(e.target.value)}
          spellCheck={false}
          aria-label="JSON du dossier de recherche"
          placeholder='Collez votre JSON research-dossier-v1 ici, ou cliquez sur « Charger l&apos;exemple » pour partir d&apos;un dossier rempli.'
          className="h-[36rem] w-full resize-none rounded-lg border border-border bg-card p-4 font-mono text-xs leading-relaxed text-foreground placeholder:text-muted-foreground focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        />

        <ValidationDisplay validation={validation} stats={stats} />

        {validation?.ok && transform && (
          <div className="rounded-md border border-border bg-card p-4">
            <h3 className="font-display text-lg">3. Soumettre à Argos</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Le dossier sera stocké avec{' '}
              <code className="font-mono">extractionMethod: EXPERT_UPLOAD</code> sur chaque asset,
              et attribué au chercheur nommé dans le dossier. L'opération est <b>idempotente</b> par
              slug — re-soumettre le même JSON met à jour, ne duplique pas.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button
                variant="accent"
                size="lg"
                onClick={handleSubmit}
                disabled={submitState.kind === 'submitting'}
              >
                {submitState.kind === 'submitting' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Envoi…
                  </>
                ) : (
                  <>Soumettre le dossier</>
                )}
              </Button>
              {submitState.kind === 'success' && (
                <span className="inline-flex items-center gap-1.5 text-sm text-success">
                  <CheckCircle2 className="h-4 w-4" />
                  Ingéré comme <code className="font-mono">{submitState.slug}</code> avec{' '}
                  {submitState.assetCount} asset{submitState.assetCount > 1 ? 's' : ''}
                </span>
              )}
              {submitState.kind === 'error' && (
                <span className="inline-flex items-center gap-1.5 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  {submitState.message}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Right : preview */}
      <div className="space-y-4">
        <div>
          <h2 className="font-display text-xl">2. Prévisualiser la référence générée</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Exactement ce qui sera stocké en base et rendu sur le site public.
          </p>
        </div>
        {transform ? (
          <div className="max-h-[40rem] overflow-auto rounded-lg border border-border bg-background">
            <ReferenceDetailView reference={transform.reference} />
            <Separator />
            <AuditDisplay audit={transform.audit} />
          </div>
        ) : (
          <div className="flex h-[40rem] items-center justify-center rounded-lg border border-dashed border-border bg-card text-sm text-muted-foreground">
            Collez un JSON valide à gauche pour voir la prévisualisation.
          </div>
        )}
      </div>
    </div>
  );
}

function ValidationDisplay({
  validation,
  stats,
}: {
  validation: ValidationResult | null;
  stats: { assets: number; sources: number; axes: number; metrics: number } | null;
}) {
  if (!validation) return null;

  if (validation.jsonError) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4">
        <h3 className="inline-flex items-center gap-1.5 font-display text-sm">
          <AlertCircle className="h-4 w-4 text-destructive" />
          Erreur de syntaxe JSON
        </h3>
        <p className="mt-2 font-mono text-xs text-destructive">{validation.jsonError}</p>
      </div>
    );
  }

  if (!validation.ok && validation.errors) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4">
        <h3 className="inline-flex items-center gap-1.5 font-display text-sm">
          <AlertCircle className="h-4 w-4 text-destructive" />
          Validation refusée ({validation.errors.length} problème
          {validation.errors.length > 1 ? 's' : ''})
        </h3>
        <ul className="mt-3 space-y-1 font-mono text-xs">
          {validation.errors.slice(0, 8).map((e) => (
            <li key={JSON.stringify([e.path, e.message])} className="flex gap-2">
              <span className="shrink-0 text-destructive">×</span>
              <span className="text-muted-foreground">
                <code className="text-foreground">{e.path}</code> — {e.message}
              </span>
            </li>
          ))}
          {validation.errors.length > 8 && (
            <li className="text-muted-foreground italic">
              … +{validation.errors.length - 8} autres problèmes
            </li>
          )}
        </ul>
      </div>
    );
  }

  if (validation.ok && stats) {
    return (
      <div className="rounded-md border border-success/40 bg-success/10 p-4">
        <h3 className="inline-flex items-center gap-1.5 font-display text-sm">
          <CheckCircle2 className="h-4 w-4 text-success" />
          Validation OK
        </h3>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Badge variant="outline" className="bg-background text-[10px]">
            {stats.assets} asset{stats.assets > 1 ? 's' : ''}
          </Badge>
          <Badge variant="outline" className="bg-background text-[10px]">
            {stats.sources} source{stats.sources > 1 ? 's' : ''}
          </Badge>
          <Badge variant="outline" className="bg-background text-[10px]">
            {stats.axes} axe{stats.axes > 1 ? 's' : ''}
          </Badge>
          <Badge variant="outline" className="bg-background text-[10px]">
            {stats.metrics} métrique{stats.metrics !== 1 ? 's' : ''}
          </Badge>
        </div>
      </div>
    );
  }

  return null;
}

function AuditDisplay({ audit }: { audit: TransformResult['audit'] }) {
  return (
    <div className="bg-muted/30 p-6">
      <h3 className="text-xs uppercase tracking-wider text-muted-foreground">
        Audit de transformation
      </h3>
      <dl className="mt-3 space-y-1 text-xs">
        <Row label="Slug généré">
          <code className="font-mono">{audit.generatedSlug}</code>
        </Row>
        <Row label="Assets générés">{audit.generatedAssetIds.length}</Row>
        <Row label="Source du score composite">{audit.compositeScoreSource}</Row>
        <Row label="Sources citées">{audit.sourcesCount}</Row>
      </dl>
      <ul className="mt-3 space-y-1 text-[11px] text-muted-foreground">
        {Array.from(new Set(audit.notes)).map((n) => (
          <li key={n}>• {n}</li>
        ))}
      </ul>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{children}</dd>
    </div>
  );
}
