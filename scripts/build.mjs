// Builds dist/esm (ES modules) and dist/cjs (CommonJS), both with type declarations.
import { execFileSync } from 'node:child_process';
import { appendFileSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const tsc = createRequire(import.meta.url).resolve('typescript/bin/tsc');
rmSync('dist', { recursive: true, force: true });
execFileSync(process.execPath, [tsc, '-p', 'tsconfig.json'], { stdio: 'inherit' });
execFileSync(process.execPath, [tsc, '-p', 'tsconfig.cjs.json'], { stdio: 'inherit' });
writeFileSync('dist/cjs/package.json', '{ "type": "commonjs" }\n');
// `require('fuse.js')` returns the class itself: the same for fuzzy-toolkit/fuse.
appendFileSync('dist/cjs/compat/fuse.js', 'module.exports = Object.assign(exports.default, exports);\n');
// Its CJS types say the same with `export =`, wrapping tsc's declarations (moved to fuse-types.d.ts).
const fuseTypes = readFileSync('dist/cjs/compat/fuse.d.ts', 'utf8');
renameSync('dist/cjs/compat/fuse.d.ts', 'dist/cjs/compat/fuse-types.d.ts');
const typeNames = [...fuseTypes.matchAll(/^export (?:declare )?(?:type|interface) (\w+)/gm)].map((m) => m[1]);
writeFileSync('dist/cjs/compat/fuse.d.ts', `import * as M from './fuse-types.js';
declare class Fuse<T> extends M.Fuse<T> {
  static default: typeof Fuse;
}
declare namespace Fuse {
  export import Fuse = M.Fuse;
${typeNames.map((n) => `  export import ${n} = M.${n};`).join('\n')}
}
export = Fuse;
`);

// Browser builds for <script> tags and CDNs (unpkg, jsDelivr): one minified file.
const { build } = await import('esbuild');
const common = { entryPoints: ['dist/esm/index.js'], bundle: true, minify: true, target: 'es2020', legalComments: 'none', logLevel: 'warning' };
await build({ ...common, format: 'esm', outfile: 'dist/browser/fuzzy-toolkit.min.js' });
await build({ ...common, format: 'iife', globalName: 'fuzzyToolkit', outfile: 'dist/browser/fuzzy-toolkit.iife.min.js' });

// llms-full.txt: the whole documentation in one file, for AI assistants.
await import('./llms-full.mjs');
