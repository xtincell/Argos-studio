// Server start hook (Next.js). Starts the daily retention purge of the private space inside the
// Node.js server (ADR-0010); never during the build, never in the edge runtime.

export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  if (process.env.NEXT_PHASE === 'phase-production-build') return;
  const holder = globalThis as unknown as { argosPrivatePurge?: unknown };
  if (holder.argosPrivatePurge) return; // a development reload keeps the running schedule
  const { startPrivatePurgeSchedule } = await import('./server/private-purge-schedule');
  holder.argosPrivatePurge = startPrivatePurgeSchedule();
}
