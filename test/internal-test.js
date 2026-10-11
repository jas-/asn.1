'use strict';
const { describe, it } = require('node:test');

const assert = require('assert');
const inherits = require('../lib/asn1/base/inherits');
const localAssert = require('../lib/asn1/base/assert');

describe('inherits', function() {
  it('should link prototypes', function() {
    function Base() {}
    Base.prototype.hello = function() {
      return 'base';
    };
    function Child() {
      Base.call(this);
    }
    Child.prototype.own = function() {
      return 'own';
    };
    inherits(Child, Base);

    const c = new Child();
    assert(c instanceof Child);
    assert(c instanceof Base);
    assert.strictEqual(c.hello(), 'base');
    assert.strictEqual(c.own(), 'own');
    assert.strictEqual(c.constructor, Child);
    assert.strictEqual(Child.super_, Base);
    assert(!Object.keys(Child).includes('super_'));
  });

  it('should support Error subclasses', function() {
    function MyError(msg) {
      this.message = msg;
    }
    inherits(MyError, Error);
    const e = new MyError('x');
    assert(e instanceof Error);
    assert.strictEqual(e.message, 'x');
  });

  it('should reject invalid arguments', function() {
    function A() {}
    assert.throws(() => inherits(null, A), TypeError);
    assert.throws(() => inherits(A, null), TypeError);
    assert.throws(() => inherits(A, {}), TypeError);
    assert.throws(() => inherits(A, () => {}), TypeError);
  });
});

describe('assert', function() {
  it('should pass on truthy values', function() {
    localAssert(true);
    localAssert(1, 'msg');
    localAssert.equal(1, '1');
  });

  it('should throw plain Errors', function() {
    assert.throws(() => localAssert(false), (e) => {
      return e.constructor === Error && e.message === 'Assertion failed';
    });
    assert.throws(() => localAssert(null, 'custom'), /^Error: custom$/);
    assert.throws(() => localAssert.equal(1, 2), /Assertion failed: 1 != 2/);
    assert.throws(() => localAssert.equal(1, 2, 'neq'), /^Error: neq$/);
  });
});
