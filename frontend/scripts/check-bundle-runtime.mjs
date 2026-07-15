import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const assetDirectories = ['dist/client/assets', 'dist/assets'];
let sourceMapPath = null;

for (const directory of assetDirectories) {
  try {
    const files = await readdir(directory);
    const sourceMap = files.find((file) => file.startsWith('index-') && file.endsWith('.js.map'));
    if (sourceMap) {
      sourceMapPath = join(directory, sourceMap);
      break;
    }
  } catch {
    // Try the next supported Vite output layout.
  }
}

if (!sourceMapPath) throw new Error('Could not find the built application source map.');

const sourceMap = JSON.parse(await readFile(sourceMapPath, 'utf8'));
const compactRuntimeRoots = new Set(
  sourceMap.sources
    .filter((source) => source.includes('@midnight-ntwrk/compact-runtime/'))
    .map((source) => source.slice(0, source.indexOf('@midnight-ntwrk/compact-runtime/'))),
);

if (compactRuntimeRoots.size !== 1) {
  throw new Error(
    `Expected one bundled Compact runtime instance, found ${compactRuntimeRoots.size}: ${[
      ...compactRuntimeRoots,
    ].join(', ')}`,
  );
}

console.log('Bundle runtime check passed: one Compact runtime instance.');
