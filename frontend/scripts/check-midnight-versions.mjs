import { readFile } from 'node:fs/promises';

const lockfile = JSON.parse(
  await readFile(new URL('../package-lock.json', import.meta.url), 'utf8'),
);

const requiredVersions = {
  '@midnight-ntwrk/compact-js': '2.5.1',
  '@midnight-ntwrk/compact-runtime': '0.16.0',
};

for (const [packageName, requiredVersion] of Object.entries(requiredVersions)) {
  const suffix = `node_modules/${packageName}`;
  const versions = new Set(
    Object.entries(lockfile.packages)
      .filter(([path]) => path.endsWith(suffix))
      .map(([, metadata]) => metadata.version),
  );

  if (versions.size !== 1 || !versions.has(requiredVersion)) {
    throw new Error(
      `${packageName} must resolve only to ${requiredVersion}; found ${[...versions].join(', ') || 'nothing'}`,
    );
  }
}

console.log('Midnight Compact dependencies are aligned.');
