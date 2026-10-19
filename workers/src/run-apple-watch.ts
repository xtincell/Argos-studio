// CLI entry point for the Apple brand watch.
//
// Usage :
//   tsx src/run-apple-watch.ts [--dry-run] [--limit=N]
//
// Default mode is LIVE (requires ANTHROPIC_API_KEY).
// --dry-run uses fixtures end-to-end and requires no secrets.

import 'dotenv/config';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { appleBrandWatch } from './watches/apple.js';
import { logger } from './lib/logger.js';

const log = logger.child({ component: 'cli:apple' });

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const useFixtures = args['--dry-run'] === true;
  const limit = typeof args['--limit'] === 'number' ? args['--limit'] : undefined;

  log.info({ useFixtures, limit, mode: useFixtures ? 'dry-run' : 'live' }, 'Apple watch CLI');

  if (!useFixtures && !process.env.ANTHROPIC_API_KEY) {
    log.error(
      'ANTHROPIC_API_KEY is not set. Live mode requires the key, or pass --dry-run to use fixtures.',
    );
    process.exit(2);
  }

  const result = await appleBrandWatch.run({ useFixtures, limit });

  const outputDir = process.env.ARGOS_DOSSIER_OUTPUT_DIR ?? './output';
  mkdirSync(outputDir, { recursive: true });
  const filename = `apple-watch-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  const path = join(outputDir, filename);
  writeFileSync(path, JSON.stringify(result, null, 2));

  // Concise console summary
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  Apple brand watch — mode: ${result.mode}`);
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  Run started at:      ${result.runStartedAt}`);
  console.log(`  Duration:            ${result.runDurationMs}ms`);
  console.log(`  Sources queried:     ${result.sourcesQueried.length}`);
  result.sourcesQueried.forEach((s) => console.log(`    • ${s}`));
  console.log('  Source receipts (NO_SIGNAL does not prove complete coverage):');
  result.sourceReceipts.forEach((s) => console.log(`    • ${s.source}: ${s.status} (${s.signalCount})`));
  console.log(`  Signals collected:   ${result.signalsCollected}`);
  console.log(`  Operations:          ${result.operationsIdentified}`);
  console.log(`  Assets extracted:    ${result.assetsExtracted}`);
  console.log('');
  console.log('  Perimeter coverage :');
  for (const [perimeter, count] of Object.entries(result.perimeterCoverage)) {
    if (count > 0) {
      console.log(`    ✓ ${perimeter.padEnd(22)} ${count} signal(s)`);
    } else {
      console.log(`    ○ ${perimeter.padEnd(22)} (not yet covered)`);
    }
  }
  console.log('');
  console.log('  Operations identified :');
  for (const op of result.operations) {
    console.log(`    • ${op.title} (${op.emissionYear}) — ${op.assets.length} assets, ${op.performance.metrics.length} metrics, composite ${op.performance.composite}`);
    op.assets.slice(0, 3).forEach((a) =>
      console.log(`        - [${a.function.padEnd(20)}] ${a.role.padEnd(10)} ${a.format ?? a.caption ?? a.text?.slice(0, 60) ?? ''}`),
    );
    if (op.assets.length > 3) console.log(`        … +${op.assets.length - 3} more`);
  }
  console.log('');
  const rejected = result.signalsLog.filter((s) => s.reference === null);
  if (rejected.length > 0) {
    console.log(`  Rejected / requires_review (${rejected.length}) :`);
    rejected.forEach((r) =>
      console.log(`    × ${r.signal.id}: ${r.notes.join(' | ') || 'no notes'}`),
    );
    console.log('');
  }
  console.log(`  Full result written to: ${path}`);
  console.log('═══════════════════════════════════════════════════════════════');
}

function parseArgs(argv: string[]): Record<string, boolean | number | string> {
  const out: Record<string, boolean | number | string> = {};
  for (const arg of argv) {
    if (arg === '--dry-run') out['--dry-run'] = true;
    else if (/^--limit=[1-9]\d*$/.test(arg) && Number.isSafeInteger(Number(arg.slice(8))))
      out['--limit'] = Number(arg.slice(8));
    else throw new Error(`Unknown option: ${arg}. Use --dry-run and/or --limit=<positive integer>.`);
  }
  return out;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
