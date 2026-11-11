// Readable descriptions of a failed request, for the screens that call the library API.
// An error is never reported as an empty result, and a body that is not JSON (gateway,
// proxy, HTML error page) is described by its HTTP status instead of a parser message.

export type FailureIssue = { path: string; message: string };
export type Failure = { message: string; issues: FailureIssue[]; retryable: boolean };

/** French wording for the error codes the library API returns. */
const CODE_MESSAGES: Record<string, string> = {
  NOT_FOUND: 'Aucune référence ne porte cet identifiant dans la bibliothèque.',
  SOURCE_DOSSIER_UNAVAILABLE: 'Le dossier d’origine n’est pas conservé pour cette ancienne référence.',
  VERSION_CONFLICT: 'La référence a changé depuis son chargement. Rechargez-la avant de modifier.',
  INGEST_UNAUTHORIZED: 'La clé d’admission est absente ou refusée.',
  INGEST_NOT_CONFIGURED: 'Les écritures ne sont pas configurées sur cette bibliothèque.',
  ORIGIN_REFUSED: 'Ouvrez l’admission depuis cette bibliothèque.',
  INVALID_JSON: 'Le serveur n’a pas pu lire le JSON envoyé.',
  INVALID_DOSSIER: 'Le serveur a refusé le dossier.',
  STORE_FAILED: 'L’enregistrement a échoué. Aucun dossier partiel n’a été conservé.',
};

/** Statuses for which trying again later can succeed without changing the request. */
export function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

/** A request that never received an HTTP response (offline, DNS, reset, aborted). */
export function describeNetworkFailure(action: string): Failure {
  return {
    message: `${action} : le réseau n’a pas répondu. Vérifiez la connexion, puis réessayez.`,
    issues: [],
    retryable: true,
  };
}

function issuesOf(value: unknown): FailureIssue[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is { path?: unknown; message?: unknown } => typeof item === 'object' && item !== null)
    .map((item) => ({
      path: typeof item.path === 'string' && item.path ? item.path : '(dossier)',
      message: typeof item.message === 'string' ? item.message : 'Valeur refusée.',
    }));
}

/** Describe an HTTP response whose status is not a success, from its status and body text. */
export function describeHttpFailure(action: string, status: number, body: string): Failure {
  let payload: unknown;
  try { payload = JSON.parse(body); } catch { payload = undefined; }
  const retryable = isRetryableStatus(status);
  if (payload && typeof payload === 'object') {
    const { error, message, issues } = payload as { error?: unknown; message?: unknown; issues?: unknown };
    const code = typeof error === 'string' ? error : undefined;
    // Server messages are kept unless the code has a French wording (some carry a parser text).
    const known = code ? CODE_MESSAGES[code] : undefined;
    const serverMessage = typeof message === 'string' && message.trim() ? message : undefined;
    const preferred = code === 'INVALID_JSON' || code === 'STORE_FAILED' ? known : serverMessage ?? known;
    return {
      message: `${action} : ${preferred ?? `le serveur a répondu HTTP ${status}${code ? ` (${code})` : ''}.`}`,
      issues: issuesOf(issues),
      retryable,
    };
  }
  const hint = retryable ? ' Le service est peut-être momentanément indisponible ; réessayez.' : '';
  return { message: `${action} : le serveur a répondu HTTP ${status}.${hint}`, issues: [], retryable };
}

/** Describe a failed Response, consuming its body once. */
export async function describeResponseFailure(action: string, response: Response): Promise<Failure> {
  let body = '';
  try { body = await response.text(); } catch { /* body unreadable: the status still describes it */ }
  return describeHttpFailure(action, response.status, body);
}
