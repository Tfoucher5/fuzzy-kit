// Downloads what npm serves for a published version and writes the files to
// attach to its GitHub release, so anyone can verify the release:
//   fuzzy-toolkit-X.Y.Z.tgz            the exact tarball on npm (integrity checked)
//   fuzzy-toolkit-X.Y.Z.sigstore.json  npm's SLSA provenance, a Sigstore bundle
//   fuzzy-toolkit-X.Y.Z.intoto.jsonl   the same signed in-toto statement (DSSE envelope)
// Usage: node scripts/release-assets.mjs <version> <out dir>
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [version, out = 'release-assets'] = process.argv.slice(2);
if (!/^\d+\.\d+\.\d+/.test(version ?? '')) {
  console.error('Usage: node scripts/release-assets.mjs <version> <out dir>');
  process.exit(1);
}
const name = 'fuzzy-toolkit';
const registry = 'https://registry.npmjs.org';

// npm takes a few minutes to serve a new version: retry for up to 10 minutes.
async function get(url, as) {
  for (let attempt = 1; ; attempt += 1) {
    const res = await fetch(url);
    if (res.ok) return as === 'json' ? res.json() : Buffer.from(await res.arrayBuffer());
    if (attempt === 40) throw new Error(`${url}: HTTP ${res.status}`);
    await new Promise((done) => setTimeout(done, 15_000));
  }
}

const meta = await get(`${registry}/${name}/${version}`, 'json');
const tarball = await get(meta.dist.tarball);
const [algo, expected] = meta.dist.integrity.split('-');
const actual = createHash(algo).update(tarball).digest('base64');
if (actual !== expected) throw new Error(`Tarball integrity mismatch for ${version}`);

const { attestations } = await get(`${registry}/-/npm/v1/attestations/${name}@${version}`, 'json');
const provenance = attestations.find((a) => a.predicateType.startsWith('https://slsa.dev/provenance/'));
if (!provenance) throw new Error(`No SLSA provenance on npm for ${version}`);

mkdirSync(out, { recursive: true });
const base = join(out, `${name}-${version}`);
writeFileSync(`${base}.tgz`, tarball);
writeFileSync(`${base}.sigstore.json`, `${JSON.stringify(provenance.bundle)}\n`);
writeFileSync(`${base}.intoto.jsonl`, `${JSON.stringify(provenance.bundle.dsseEnvelope)}\n`);
console.log(`Wrote ${base}.{tgz,sigstore.json,intoto.jsonl}`);
