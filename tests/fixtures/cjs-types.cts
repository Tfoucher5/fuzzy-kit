// Type-checked against dist/cjs by tests/cjs.test.cjs: the types must match `module.exports = Fuse`.
import Fuse = require('../../dist/cjs/compat/fuse.js');
import DefaultFuse, { Fuse as NamedFuse, type FuseResult } from '../../dist/cjs/compat/fuse.js';
import stringSimilarity = require('../../dist/cjs/compat/string-similarity.js');
const fuse: Fuse<string> = new Fuse(['a'], { threshold: 0.4 });
const item: string | undefined = fuse.search('a')[0]?.item;
const results: Fuse.FuseResult<string>[] = fuse.search('a');
const named: NamedFuse<string> = new Fuse.Fuse(['a']);
const viaDefault: FuseResult<string>[] = new DefaultFuse(['a']).search('a');
const same: typeof Fuse = Fuse.default;
const options: Fuse.IFuseOptions<string> = { includeScore: true };
const rating: number = stringSimilarity.compareTwoStrings('a', 'b') + stringSimilarity.findBestMatch('a', ['b']).bestMatch.rating;
export { item, results, named, viaDefault, same, options, rating };
