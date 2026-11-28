// A worker thread for the worker tests: what a Web Worker file does in a browser.
import { parentPort } from 'node:worker_threads';
import { serve } from '../../dist/esm/worker-serve.js';

serve(parentPort);
