'use client';

import { AlertCircle, CheckCircle2, Copy, Download, FileJson, Loader2, Upload } from 'lucide-react';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ReferenceDetailView } from '@/components/reference-detail-view';
import {
  type Failure,
  describeHttpFailure,
  describeNetworkFailure,
  describeResponseFailure,
} from '@/lib/fetch-failure';
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
  | { kind: 'error'; failure: Failure; offerReload: boolean; offerLogin: boolean };

/** State of the requests that fill the editor (current dossier, example, template, file). */
type Notice =
  | { kind: 'loading'; message: string }
  | { kind: 'info'; message: string }
  | { kind: 'error'; failure: Failure; retry?: () => void };

const MOBILE_TARGET = 'min-h-[44px] sm:min-h-0';

function plainFailure(message: string): Failure {
  return { message, issues: [], retryable: false };
}

export function DossierIngestForm({ initialSlug }: { initialSlug?: string }) {
  const inputId = useId();
  const [json, setJson] = useState('');
  const [expectedVersion, setExpectedVersion] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const loadCurrent = useCallback(async (slug: string) => {
    const action = 'Chargement du dossier courant';
    const retry = () => { void loadCurrent(slug); };
    const base = `/api/v1/references/${encodeURIComponent(slug)}`;
    setNotice({ kind: 'loading', message: `Chargement du dossier « ${slug} »…` });
    let response: Response;
    try {
      response = await fetch(`${base}?format=dossier`, { cache: 'no-store' });
    } catch {
      if (mounted.current) setNotice({ kind: 'error', failure: describeNetworkFailure(action), retry });
      return;
    }
    if (response.ok) {
      let original: unknown;
      try { original = await response.json(); } catch {
        if (mounted.current) setNotice({ kind: 'error', failure: describeHttpFailure(action, response.status, ''), retry });
        return;
      }
      if (!mounted.current) return;
      setExpectedVersion(response.headers.get('ETag'));
      setJson(JSON.stringify(original, null, 2));
      setNotice(null);
      return;
    }
    if (response.status === 404) {
      if (mounted.current) setNotice({ kind: 'error', failure: plainFailure(`Aucune référence « ${slug} » n’existe dans la bibliothèque. Vous pouvez soumettre un nouveau dossier.`) });
      return;
    }
    if (response.status !== 409) {
      const failure = await describeResponseFailure(action, response);
      if (mounted.current) setNotice({ kind: 'error', failure, retry: failure.retryable ? retry : undefined });
      return;
    }
    // The reference exists without its original dossier: keep its version for an amendment.
    try {
      const current = await fetch(base, { cache: 'no-store' });
      if (!current.ok) {
        const failure = await describeResponseFailure(action, current);
        if (mounted.current) setNotice({ kind: 'error', failure, retry: failure.retryable ? retry : undefined });
        return;
      }
      const payload = (await current.json()) as { data?: { updatedAt?: string } };
      if (!mounted.current) return;
      setExpectedVersion(payload.data?.updatedAt ? JSON.stringify(payload.data.updatedAt) : null);
      setNotice({ kind: 'error', failure: plainFailure('Le dossier d’origine n’est pas conservé pour cette ancienne référence. Chargez votre fichier pour la reprendre ; aucune source n’est reconstituée automatiquement.') });
    } catch {
      if (mounted.current) setNotice({ kind: 'error', failure: describeNetworkFailure(action), retry });
    }
  }, []);

  useEffect(() => {
    if (initialSlug) void loadCurrent(initialSlug);
  }, [initialSlug, loadCurrent]);

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
    const action = 'Envoi du dossier';
    setSubmitState({ kind: 'submitting' });
    let res: Response;
    try {
      res = await fetch('/api/v1/ingest/dossier', {
        method: 'POST',
        // The administration session travels as an HttpOnly cookie; the key never reaches this page.
        headers: { 'Content-Type': 'application/json', ...(expectedVersion ? { 'If-Match': expectedVersion } : {}) },
        credentials: 'same-origin',
        body: json,
      });
    } catch {
      setSubmitState({ kind: 'error', failure: describeNetworkFailure(action), offerReload: false, offerLogin: false });
      return;
    }
    if (!res.ok) {
      setSubmitState({ kind: 'error', failure: await describeResponseFailure(action, res), offerReload: res.status === 409, offerLogin: res.status === 401 });
      return;
    }
    let data: { ok?: boolean; slug?: string; assetCount?: number; updatedAt?: string; message?: string };
    try {
      data = await res.json();
    } catch {
      setSubmitState({ kind: 'error', failure: plainFailure(`${action} : la réponse du serveur (HTTP ${res.status}) est illisible. Rechargez la référence pour vérifier si elle a été enregistrée.`), offerReload: true, offerLogin: false });
      return;
    }
    if (!data.ok || !data.slug) {
      setSubmitState({ kind: 'error', failure: plainFailure(`${action} : ${data.message ?? 'le serveur n’a pas confirmé l’enregistrement.'}`), offerReload: true, offerLogin: false });
      return;
    }
    setExpectedVersion(data.updatedAt ? JSON.stringify(data.updatedAt) : null);
    setSubmitState({ kind: 'success', slug: data.slug, assetCount: data.assetCount ?? 0 });
  }

  async function loadExample() {
    const action = 'Chargement de l’exemple';
    setNotice({ kind: 'loading', message: 'Chargement de l’exemple…' });
    try {
      const res = await fetch('/dossier-example.json', { cache: 'no-store' });
      if (!res.ok) {
        setNotice({ kind: 'error', failure: await describeResponseFailure(action, res), retry: () => { void loadExample(); } });
        return;
      }
      setJson(await res.text());
      setNotice(null);
    } catch {
      setNotice({ kind: 'error', failure: describeNetworkFailure(action), retry: () => { void loadExample(); } });
    }
  }

  async function copyTemplate() {
    const action = 'Copie du modèle';
    const retry = () => { void copyTemplate(); };
    let text: string;
    try {
      const res = await fetch('/dossier-template.json', { cache: 'no-store' });
      if (!res.ok) {
        setNotice({ kind: 'error', failure: await describeResponseFailure(action, res), retry });
        return;
      }
      text = await res.text();
    } catch {
      setNotice({ kind: 'error', failure: describeNetworkFailure(action), retry });
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setNotice({ kind: 'info', message: 'Modèle copié dans le presse-papiers.' });
    } catch {
      setNotice({ kind: 'error', failure: plainFailure(`${action} : le presse-papiers a refusé l’écriture. Utilisez « Télécharger le modèle ».`) });
    }
  }

  function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.target;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      if (typeof text === 'string') {
        setJson(text);
        setNotice(null);
      }
    };
    reader.onerror = () => {
      setNotice({ kind: 'error', failure: plainFailure(`Lecture du fichier « ${file.name} » impossible. Choisissez-le à nouveau.`) });
    };
    reader.readAsText(file);
    // The same file can be chosen again after a correction.
    input.value = '';
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      {/* Left : input + validation */}
      <div className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-xl">1. Coller ou importer le JSON du dossier</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Schema : <code className="font-mono">research-dossier-v1</code> ·{' '}
              <a href="/docs/research-dossier-spec" className="underline">
                voir la spec
              </a>
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Button variant="outline" size="sm" className={MOBILE_TARGET} onClick={loadExample}>
              <FileJson className="h-3.5 w-3.5" aria-hidden />
              Charger l’exemple
            </Button>
            <Button variant="outline" size="sm" className={MOBILE_TARGET} onClick={copyTemplate}>
              <Copy className="h-3.5 w-3.5" aria-hidden />
              Copier le modèle
            </Button>
            <Button variant="outline" size="sm" className={MOBILE_TARGET} asChild>
              <a href="/dossier-template.json" download>
                <Download className="h-3.5 w-3.5" aria-hidden />
                Télécharger le modèle
              </a>
            </Button>
            <label
              className={cn(
                'inline-flex h-8 cursor-pointer items-center gap-2 rounded-md border border-border bg-transparent px-3 text-xs font-medium transition-colors hover:bg-muted',
                'focus-within:ring-2 focus-within:ring-ink focus-within:ring-offset-2 focus-within:ring-offset-bg',
                MOBILE_TARGET,
              )}
            >
              <input
                type="file"
                accept="application/json,.json"
                onChange={handleFileUpload}
                className="sr-only"
              />
              <Upload className="h-3.5 w-3.5" aria-hidden />
              Importer un fichier
            </label>
          </div>
        </div>

        {notice && <NoticeDisplay notice={notice} />}

        <textarea
          id={inputId}
          value={json}
          onChange={(e) => setJson(e.target.value)}
          spellCheck={false}
          aria-label="JSON du dossier de recherche"
          aria-busy={notice?.kind === 'loading'}
          placeholder='Collez votre JSON research-dossier-v1 ici, ou cliquez sur « Charger l&apos;exemple » pour partir d&apos;un dossier rempli.'
          className="h-[36rem] w-full resize-none rounded-lg border border-border bg-card p-4 font-mono text-xs leading-relaxed text-foreground placeholder:text-muted-foreground focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
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
                className={MOBILE_TARGET}
                onClick={handleSubmit}
                disabled={submitState.kind === 'submitting'}
                aria-busy={submitState.kind === 'submitting'}
              >
                {submitState.kind === 'submitting' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    Envoi…
                  </>
                ) : (
                  <>Soumettre le dossier</>
                )}
              </Button>
            </div>
            <output className="mt-3 block">
              {submitState.kind === 'success' && (
                <span className="inline-flex flex-wrap items-center gap-1.5 text-sm text-success">
                  <CheckCircle2 className="h-4 w-4" aria-hidden />
                  Ingéré comme <code className="font-mono">{submitState.slug}</code> avec{' '}
                  {submitState.assetCount} asset{submitState.assetCount > 1 ? 's' : ''}.{' '}
                  <a className="underline" href={`/work/${submitState.slug}`}>Ouvrir la référence</a>
                </span>
              )}
            </output>
            {submitState.kind === 'error' && (
              <FailureDisplay failure={submitState.failure}>
                {submitState.offerLogin && (
                  // A new tab keeps the dossier typed here; once the session is open, submit again.
                  <a className="underline" target="_blank" rel="noopener noreferrer" href={`/admin/login?${new URLSearchParams({ next: '/admin/ingest' }).toString()}`}>
                    Rouvrir la session dans un nouvel onglet (le dossier reste ici)
                  </a>
                )}
                {submitState.offerReload && (
                  <a className="underline" href={`/admin/ingest?slug=${encodeURIComponent(transform.reference.slug)}`}>
                    Charger le dossier actuel
                  </a>
                )}
              </FailureDisplay>
            )}
          </div>
        )}
      </div>

      {/* Right : preview */}
      <div className="min-w-0 space-y-4">
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
          <div className="flex h-[40rem] items-center justify-center rounded-lg border border-dashed border-border bg-card p-4 text-center text-sm text-muted-foreground">
            {notice?.kind === 'loading' ? notice.message : 'Collez un JSON valide à gauche pour voir la prévisualisation.'}
          </div>
        )}
      </div>
    </div>
  );
}

function NoticeDisplay({ notice }: { notice: Notice }) {
  if (notice.kind === 'error') {
    return (
      <FailureDisplay failure={notice.failure}>
        {notice.retry && (
          <Button variant="outline" size="sm" className={MOBILE_TARGET} onClick={notice.retry}>
            Réessayer
          </Button>
        )}
      </FailureDisplay>
    );
  }
  return (
    <output className="flex items-center gap-2 text-sm text-ink-2">
      {notice.kind === 'loading' && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {notice.message}
    </output>
  );
}

/** A readable failure: what failed, the server issues if any, and what can be done. */
function FailureDisplay({ failure, children }: { failure: Failure; children?: React.ReactNode }) {
  return (
    <div role="alert" className="mt-3 rounded-md border border-[#e3a796] bg-[#fff1ec] p-4 text-sm text-[#7a2614]">
      <p className="flex items-start gap-1.5">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <span>{failure.message}</span>
      </p>
      {failure.issues.length > 0 && (
        <ul className="mt-2 space-y-1 font-mono text-xs">
          {failure.issues.slice(0, 8).map((issue) => (
            <li key={JSON.stringify([issue.path, issue.message])}>
              <code>{issue.path}</code> — {issue.message}
            </li>
          ))}
          {failure.issues.length > 8 && <li>… +{failure.issues.length - 8} autres problèmes</li>}
        </ul>
      )}
      {children && <div className="mt-3 flex flex-wrap items-center gap-3">{children}</div>}
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
      <div className="rounded-md border border-[#e3a796] bg-[#fff1ec] p-4">
        <h3 className="inline-flex items-center gap-1.5 font-display text-sm">
          <AlertCircle className="h-4 w-4 text-[#7a2614]" />
          Erreur de syntaxe JSON
        </h3>
        <p className="mt-2 font-mono text-xs text-[#7a2614]">{validation.jsonError}</p>
      </div>
    );
  }

  if (!validation.ok && validation.errors) {
    return (
      <div className="rounded-md border border-[#e3a796] bg-[#fff1ec] p-4">
        <h3 className="inline-flex items-center gap-1.5 font-display text-sm">
          <AlertCircle className="h-4 w-4 text-[#7a2614]" />
          Validation refusée ({validation.errors.length} problème
          {validation.errors.length > 1 ? 's' : ''})
        </h3>
        <ul className="mt-3 space-y-1 font-mono text-xs">
          {validation.errors.slice(0, 8).map((e) => (
            <li key={JSON.stringify([e.path, e.message])} className="flex gap-2">
              <span className="shrink-0 text-[#7a2614]">×</span>
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
