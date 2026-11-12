// Daily retention purge inside the server process (ADR-0010): no external scheduler, and the
// process that serves the library stays the only writer of its SQLite file (ADR-0009).
//
// ARGOS_PRIVATE_PURGE=off (or 0/false/no/non) disables it; any other value, or none, keeps the
// default: a first run a few minutes after start, then every 24 hours. Each run is logged on the
// server output and, when it deletes, in the database (PrivatePurgeRun, counts only).

import type { PurgeMode, PurgeReport } from '@/server/private-retention';

export const PRIVATE_PURGE_INTERVAL_MS = 24 * 60 * 60 * 1000;
export const PRIVATE_PURGE_FIRST_DELAY_MS = 5 * 60 * 1000;
const DISABLED = new Set(['off', '0', 'false', 'no', 'non']);

interface Timer { unref?: () => unknown }
interface Timers {
  setTimeout(run: () => void, delay: number): Timer;
  setInterval(run: () => void, delay: number): Timer;
  clearTimeout(timer: Timer): void;
  clearInterval(timer: Timer): void;
}

type Run = (options: { mode: PurgeMode; trigger: string }) => Promise<PurgeReport | unknown>;

const defaultRun: Run = async (options) => {
  const { purgeExpiredPrivateDossiers } = await import('@/server/private-retention');
  return purgeExpiredPrivateDossiers(options);
};

export function startPrivatePurgeSchedule(options: {
  env?: Record<string, string | undefined>;
  timers?: Timers;
  run?: Run;
  log?: (message: string) => void;
} = {}): { enabled: boolean; stop(): void } {
  const env = options.env ?? process.env;
  const timers = options.timers ?? (globalThis as unknown as Timers);
  const run = options.run ?? defaultRun;
  const log = options.log ?? ((message: string) => console.info(message));
  const setting = (env.ARGOS_PRIVATE_PURGE ?? '').trim().toLowerCase();
  if (DISABLED.has(setting)) {
    log('[argos] purge des dossiers privés désactivée (ARGOS_PRIVATE_PURGE=off) : la rétention de 24 mois n’est appliquée que par argos-purge-private.');
    return { enabled: false, stop() {} };
  }
  let interval: Timer | undefined;
  const tick = () => {
    run({ mode: 'purge', trigger: 'scheduler' }).catch((error: unknown) => {
      log(`[argos] la purge quotidienne des dossiers privés a échoué : ${error instanceof Error ? error.message : String(error)}`);
    });
  };
  const first = timers.setTimeout(() => {
    tick();
    interval = timers.setInterval(tick, PRIVATE_PURGE_INTERVAL_MS);
    interval.unref?.();
  }, PRIVATE_PURGE_FIRST_DELAY_MS);
  first.unref?.();
  log('[argos] purge des dossiers privés : quotidienne, rétention de 24 mois après la dernière modification.');
  return {
    enabled: true,
    stop() {
      timers.clearTimeout(first);
      if (interval) timers.clearInterval(interval);
    },
  };
}
