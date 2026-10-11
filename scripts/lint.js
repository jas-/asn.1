'use strict';

// Dependency-free linter built only on Node.js built-ins.
//
// Checks every .js file in the project (excluding node_modules) for:
//   * syntax errors           (`node --check`)
//   * 'use strict' directive  (first statement in the file)
//   * unix line endings       (no CR characters)
//   * indentation             (spaces only, no tabs)
//   * single-quoted strings   (no double-quoted string literals)
//
// Usage: node scripts/lint.js [path ...]

const fs = require('node:fs');
const path = require('node:path');
const spawnSync = require('node:child_process').spawnSync;

const ROOT = path.join(__dirname, '..');
const DEFAULT_PATHS = ['lib', 'test', 'scripts', 'rfc'];
const SKIP_DIRS = new Set(['node_modules', '.git']);

function collect(target, out) {
  const stat = fs.statSync(target);
  if (stat.isFile()) {
    if (target.endsWith('.js'))
      out.push(target);
    return out;
  }
  for (const name of fs.readdirSync(target).sort()) {
    if (SKIP_DIRS.has(name))
      continue;
    collect(path.join(target, name), out);
  }
  return out;
}

// Keywords after which a `/` starts a regular expression, not a division.
const REGEX_KEYWORDS = new Set([
  'return', 'typeof', 'instanceof', 'in', 'of', 'new', 'delete', 'void',
  'throw', 'case', 'do', 'else', 'yield', 'await'
]);

function isIdentChar(c) {
  return /[A-Za-z0-9_$]/.test(c);
}

// Minimal tokenizer: skips comments, regexes and template literals, and
// returns the line numbers of double-quoted string literals.
function findDoubleQuotedStrings(src) {
  const found = [];
  const templateStack = [];
  let braceDepth = 0;
  let line = 1;
  let prev = { type: 'start' };
  let i = 0;

  function countLines(from, to) {
    for (let j = from; j < to; j++) {
      if (src[j] === '\n')
        line++;
    }
  }

  function regexAllowed() {
    if (prev.type === 'start')
      return true;
    if (prev.type === 'word')
      return REGEX_KEYWORDS.has(prev.value);
    if (prev.type === 'value')
      return false;
    return prev.value !== ')' && prev.value !== ']' && prev.value !== '}';
  }

  // Scans template text starting at `i`; returns when the template ends or
  // a `${` placeholder opens (code scanning then resumes).
  function scanTemplate() {
    while (i < src.length) {
      const c = src[i];
      if (c === '\\') {
        countLines(i, i + 2);
        i += 2;
      } else if (c === '`') {
        i++;
        prev = { type: 'value' };
        return;
      } else if (c === '$' && src[i + 1] === '{') {
        templateStack.push(braceDepth);
        i += 2;
        prev = { type: 'punct', value: '{' };
        return;
      } else {
        if (c === '\n')
          line++;
        i++;
      }
    }
  }

  while (i < src.length) {
    const c = src[i];

    if (c === '\n') {
      line++;
      i++;
    } else if (/\s/.test(c)) {
      i++;
    } else if (c === '/' && src[i + 1] === '/') {
      while (i < src.length && src[i] !== '\n')
        i++;
    } else if (c === '/' && src[i + 1] === '*') {
      let end = src.indexOf('*/', i + 2);
      end = end === -1 ? src.length : end + 2;
      countLines(i, end);
      i = end;
    } else if (c === '\'' || c === '"') {
      const startLine = line;
      let j = i + 1;
      while (j < src.length && src[j] !== c) {
        if (src[j] === '\\')
          j++;
        j++;
      }
      countLines(i, j);
      i = j + 1;
      if (c === '"')
        found.push(startLine);
      prev = { type: 'value' };
    } else if (c === '`') {
      i++;
      scanTemplate();
    } else if (c === '/' && regexAllowed()) {
      let inClass = false;
      i++;
      while (i < src.length && src[i] !== '\n') {
        const r = src[i];
        if (r === '\\') {
          i += 2;
          continue;
        }
        i++;
        if (r === '[')
          inClass = true;
        else if (r === ']')
          inClass = false;
        else if (r === '/' && !inClass)
          break;
      }
      while (i < src.length && isIdentChar(src[i]))
        i++;
      prev = { type: 'value' };
    } else if (isIdentChar(c)) {
      const start = i;
      while (i < src.length && isIdentChar(src[i]))
        i++;
      prev = { type: 'word', value: src.slice(start, i) };
    } else {
      if (c === '{') {
        braceDepth++;
      } else if (c === '}') {
        if (templateStack.length &&
            templateStack[templateStack.length - 1] === braceDepth) {
          templateStack.pop();
          i++;
          scanTemplate();
          continue;
        }
        braceDepth--;
      }
      prev = { type: 'punct', value: c };
      i++;
    }
  }
  return found;
}

function hasUseStrict(src) {
  // Skip a shebang, blank lines and comments before the first statement.
  const body = src
    .replace(/^#!.*\n/, '')
    .replace(/^(\s+|\/\/[^\n]*\n|\/\*[\s\S]*?\*\/)*/, '');
  return /^'use strict';/.test(body);
}

function lintFile(file) {
  const problems = [];
  const report = (line, msg) => problems.push({ file, line, msg });
  const src = fs.readFileSync(file, 'utf8');

  const check = spawnSync(process.execPath, ['--check', file], {
    encoding: 'utf8'
  });
  if (check.status !== 0) {
    const m = /:(\d+)\n/.exec(check.stderr);
    report(m ? Number(m[1]) : 1,
      'Syntax error: ' + (check.stderr.match(/SyntaxError: .*/) || [''])[0]);
    return problems;
  }

  if (!hasUseStrict(src))
    report(1, 'Missing \'use strict\' directive');

  src.split('\n').forEach((text, idx) => {
    if (text.includes('\r'))
      report(idx + 1, 'Expected linebreaks to be LF but found CRLF');
    if (/^\s*\t/.test(text))
      report(idx + 1, 'Use spaces for indentation, not tabs');
  });

  for (const line of findDoubleQuotedStrings(src))
    report(line, 'Strings must use singlequote');

  return problems;
}

function main() {
  const targets = process.argv.slice(2);
  const roots = (targets.length ? targets : DEFAULT_PATHS)
    .map((p) => path.resolve(ROOT, p))
    .filter((p) => fs.existsSync(p));

  const files = [];
  for (const r of roots)
    collect(r, files);

  const problems = [];
  for (const f of files)
    problems.push(...lintFile(f));

  for (const p of problems)
    console.log(path.relative(ROOT, p.file) + ':' + p.line + ': ' + p.msg);

  if (problems.length) {
    console.log('\n' + problems.length + ' problem(s) in ' + files.length +
                ' file(s)');
    process.exit(1);
  }
  console.log('Linted ' + files.length + ' file(s), no problems');
}

if (require.main === module)
  main();

module.exports = { findDoubleQuotedStrings, hasUseStrict, lintFile };
