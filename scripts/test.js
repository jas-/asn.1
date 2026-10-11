'use strict';

// Runs the test suite with the built-in Node.js test runner (node:test).
//
// Usage: node scripts/test.js [dir] [-- extra node --test flags]
//
// Test files (`*-test.js`) are passed as explicit paths rather than a glob
// or directory: glob support in `node --test` only exists on Node 21+, and
// shells on Windows do not expand globs. This works the same everywhere.

const fs = require('node:fs');
const path = require('node:path');
const spawnSync = require('node:child_process').spawnSync;

const argv = process.argv.slice(2);
const sep = argv.indexOf('--');
const extra = sep === -1 ? [] : argv.slice(sep + 1);
const positional = sep === -1 ? argv : argv.slice(0, sep);

const dir = path.resolve(positional[0] || path.join(__dirname, '..', 'test'));

const files = fs.readdirSync(dir)
  .filter((name) => name.endsWith('-test.js'))
  .sort()
  .map((name) => path.join(dir, name));

if (files.length === 0) {
  console.error('No *-test.js files found in ' + dir);
  process.exit(1);
}

const res = spawnSync(process.execPath, ['--test'].concat(extra, files), {
  stdio: 'inherit'
});

if (res.error)
  throw res.error;
process.exit(res.status === null ? 1 : res.status);
