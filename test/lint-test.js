'use strict';
const { describe, it } = require('node:test');

const assert = require('assert');
const lint = require('../scripts/lint');

describe('lint', function() {
  describe('findDoubleQuotedStrings', function() {
    const f = lint.findDoubleQuotedStrings;

    it('should find double-quoted strings', function() {
      assert.deepStrictEqual(f('const a = "x";\nconst b = "y";'), [1, 2]);
      assert.deepStrictEqual(f('const s = \'it\\\'s\'; "z"'), [1]);
    });

    it('should ignore single-quoted strings', function() {
      assert.deepStrictEqual(f('const s = \'say "hi"\';'), []);
    });

    it('should ignore comments', function() {
      assert.deepStrictEqual(f('// "no"\n/* "no"\n */ "yes"'), [3]);
    });

    it('should ignore regular expressions', function() {
      assert.deepStrictEqual(f('const r = /"[^"]*"/g;'), []);
      assert.deepStrictEqual(f('function a() { return /"/.test(x); }'), []);
      assert.deepStrictEqual(f('const r = /[/"]/; "x"'), [1]);
    });

    it('should treat division as an operator', function() {
      assert.deepStrictEqual(f('const x = a / b; const y = "s";'), [1]);
      assert.deepStrictEqual(f('const x = (a) / 2 / "s";'), [1]);
    });

    it('should handle template literals', function() {
      assert.deepStrictEqual(f('const t = `"lit"`;'), []);
      assert.deepStrictEqual(f('const t = `${ {k: "v"}.k }`; "y"'), [1, 1]);
      assert.deepStrictEqual(f('`\n"\n${a}\n`\n"q"'), [5]);
      assert.deepStrictEqual(f('`${`${"deep"}`}`'), [1]);
    });
  });

  describe('hasUseStrict', function() {
    const h = lint.hasUseStrict;

    it('should require the directive first', function() {
      assert(h('\'use strict\';\n'));
      assert(h('// header\n/* block */\n\n\'use strict\';\n'));
      assert(h('#!/usr/bin/env node\n\'use strict\';\n'));
      assert(!h('const a = 1;\n\'use strict\';\n'));
      assert(!h('"use strict";\n'));
    });
  });
});
