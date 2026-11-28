/**
 * The worker side of `fuzzy-toolkit/worker`: import it in a worker file and
 * nothing else is needed. `serve(scope)` is exported for other environments
 * (a `MessagePort`, Node's `worker_threads`).
 * @module
 */
import { createIndex, type Index } from './matcher.js';
import type { WorkerMatch } from './worker.js';

interface Scope {
  postMessage(message: unknown): void;
  addEventListener(type: 'message', listener: (event: { data: unknown }) => void): void;
}

/** Answers the messages of `createWorkerIndex` on `scope`. */
export function serve(scope: Scope): void {
  let index: Index<unknown> | null = null;
  // An index that could not be built answers every search with why.
  let broken: string | null = null;
  scope.addEventListener('message', (event) => {
    const message = event.data as { type: string; id?: number; items?: unknown[]; options?: Record<string, unknown>; query?: string };
    if (message?.type === 'init') {
      try {
        index = createIndex(message.items ?? [], (message.options ?? {}) as never);
        broken = null;
      } catch (error) {
        index = null;
        broken = error instanceof Error ? error.message : String(error);
      }
      return;
    }
    if (message?.type !== 'search') return;
    try {
      if (broken !== null) throw new Error(broken);
      if (!index) throw new Error('[fuzzy-toolkit] The worker index has no items yet.');
      const results: WorkerMatch[] = index.search(message.query ?? '', message.options ?? {}).map(({ item: _item, ...rest }) => rest);
      scope.postMessage({ id: message.id, results });
    } catch (error) {
      scope.postMessage({ id: message.id, error: error instanceof Error ? error.message : String(error) });
    }
  });
}

// In a Web Worker, serve at once.
const self = (globalThis as { WorkerGlobalScope?: unknown; postMessage?: unknown }).WorkerGlobalScope !== undefined ? (globalThis as unknown as Scope) : null;
if (self) serve(self);
