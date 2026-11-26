// Builds dist/esm (ES modules) and dist/cjs (CommonJS), both with type declarations.
import { execFileSync } from 'node:child_process';
import { rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const tsc = createRequire(import.meta.url).resolve('typescript/bin/tsc');
rmSync('dist', { recursive: true, force: true });
execFileSync(process.execPath, [tsc, '-p', 'tsconfig.json'], { stdio: 'inherit' });
execFileSync(process.execPath, [tsc, '-p', 'tsconfig.cjs.json'], { stdio: 'inherit' });
writeFileSync('dist/cjs/package.json', '{ "type": "commonjs" }\n');

// Browser builds for <script> tags and CDNs (unpkg, jsDelivr): one minified file.
const { build } = await import('esbuild');
const common = { entryPoints: ['dist/esm/index.js'], bundle: true, minify: true, target: 'es2020', legalComments: 'none', logLevel: 'warning' };
await build({ ...common, format: 'esm', outfile: 'dist/browser/fuzzy-toolkit.min.js' });
await build({ ...common, format: 'iife', globalName: 'fuzzyToolkit', outfile: 'dist/browser/fuzzy-toolkit.iife.min.js' });
