import type { RawSignal, SourcePerimeter, SourceReceipt } from './types.js';

interface SourceAttempt {
  name: string;
  perimeter: SourcePerimeter;
  crawl: () => Promise<RawSignal[]>;
}

export class SourceCollectionFailure extends Error {
  constructor(readonly signals: RawSignal[] = []) {
    super('SOURCE_COLLECTION_FAILED');
  }
}

/** One unavailable source must not discard observations from the others. */
export async function collectSources(sources: SourceAttempt[], useFixtures: boolean) {
  const settled = await Promise.allSettled(sources.map((source) =>
    Promise.resolve().then(() => source.crawl())));
  const signals: RawSignal[] = [];
  const receipts: SourceReceipt[] = settled.map((result, index) => {
    const source = sources[index];
    if (!source) throw new Error('Missing source descriptor');
    if (result.status === 'rejected') {
      const retained = result.reason instanceof SourceCollectionFailure ? result.reason.signals : [];
      signals.push(...retained);
      return { source: source.name, perimeter: source.perimeter, signalCount: retained.length,
        status: result.reason instanceof Error && result.reason.message.startsWith('SOURCE_UNAVAILABLE:')
          ? 'UNAVAILABLE' : retained.length ? 'PARTIAL' : 'FAILED' };
    }
    signals.push(...result.value);
    return { source: source.name, perimeter: source.perimeter,
      signalCount: result.value.length,
      status: useFixtures ? 'FIXTURE' : result.value.length ? 'OBSERVED' : 'NO_SIGNAL' };
  });
  return { signals, receipts };
}
