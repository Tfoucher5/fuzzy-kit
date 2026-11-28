/**
 * Search in a Web Worker, so typing stays smooth on very large lists:
 * the index lives in the worker, the page only sends queries.
 *
 * ```js
 * // search-worker.js: one line
 * import 'fuzzy-toolkit/worker/serve'
 *
 * // app.js
 * import { createWorkerIndex } from 'fuzzy-toolkit/worker'
 * const worker = new Worker(new URL('./search-worker.js', import.meta.url), { type: 'module' })
 * const index = createWorkerIndex(worker, cities, { keys: ['name'], preset: 'search' })
 * const results = await index.search('new yo', { limit: 10 })
 * ```
 * @module
 */
import type { ListOptions, Match } from './types.js';

/**
 * What the worker side needs: `postMessage`, and a way to listen. Any Web
 * Worker or `MessagePort` fits, and so does a Node `worker_threads` Worker
 * (`on('message')`).
 */
export interface WorkerLike {
  postMessage(message: unknown): void;
  addEventListener?(type: 'message', listener: (event: { data: unknown }) => void): void;
  on?(type: 'message', listener: (data: unknown) => void): unknown;
  terminate?(): unknown;
}

/** Options of {@link WorkerIndex.search}. */
export interface WorkerSearchOptions {
  limit?: number;
  threshold?: number;
  includeMatches?: boolean;
}

export interface WorkerIndex<T> {
  /** Results for `query`, best first, with the original items. */
  search(query: string, options?: WorkerSearchOptions): Promise<Match<T>[]>;
  /** Replaces the list. */
  setItems(items: readonly T[]): void;
  /** Stops the worker. */
  terminate(): void;
}

/** A match as the worker sends it: without the item, which stays on this side. */
export interface WorkerMatch {
  index: number;
  score: number;
  text: string;
  key?: string;
  ranges?: [number, number][];
}

/**
 * Builds an index in `worker` (which imports `fuzzy-toolkit/worker/serve`)
 * and returns a handle to search it. Items and options are copied to the
 * worker, so keys must be names or paths, not functions.
 */
export function createWorkerIndex<T>(worker: WorkerLike, items: readonly T[], options: ListOptions<T> = {}): WorkerIndex<T> {
  if (typeof options.keys === 'function') {
    throw new TypeError('[fuzzy-toolkit] A worker index cannot take a function as keys: pass property names or paths.');
  }
  let list = items;
  let next = 0;
  const pending = new Map<number, { resolve: (m: Match<T>[]) => void; reject: (e: Error) => void; items: readonly T[] }>();
  const receive = (message: unknown): void => {
    const data = message as { id: number; results?: WorkerMatch[]; error?: string };
    const call = pending.get(data?.id);
    if (!call) return;
    pending.delete(data.id);
    if (data.error !== undefined) call.reject(new Error(data.error));
    else call.resolve((data.results ?? []).map((m) => ({ ...m, item: call.items[m.index]! })));
  };
  if (typeof worker.addEventListener === 'function') worker.addEventListener('message', (event) => receive(event.data));
  else if (typeof worker.on === 'function') worker.on('message', receive);
  else throw new TypeError('[fuzzy-toolkit] createWorkerIndex needs a Worker: an object with postMessage and addEventListener (or on).');
  worker.postMessage({ type: 'init', items: list, options });
  return {
    search(query, searchOptions = {}) {
      const id = (next += 1);
      return new Promise((resolve, reject) => {
        // Results map back to the list the query was sent with.
        pending.set(id, { resolve, reject, items: list });
        worker.postMessage({ type: 'search', id, query: String(query ?? ''), options: searchOptions });
      });
    },
    setItems(items) {
      list = items;
      worker.postMessage({ type: 'init', items, options });
    },
    terminate() {
      for (const call of pending.values()) call.reject(new Error('[fuzzy-toolkit] The worker index was terminated.'));
      pending.clear();
      worker.terminate?.();
    },
  };
}
