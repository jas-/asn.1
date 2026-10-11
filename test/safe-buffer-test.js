'use strict';
const { describe, it } = require('node:test');

const assert = require('assert');
const Buffer = require('../lib/asn1/base/safe-buffer').Buffer;

describe('safe-buffer', function() {
  it('should not expose unsafe allocation APIs', function() {
    assert.strictEqual(Buffer.allocUnsafe, undefined);
    assert.strictEqual(Buffer.allocUnsafeSlow, undefined);
    assert.strictEqual(typeof Buffer, 'object');
    assert(Object.isFrozen(Buffer));
  });

  it('should zero-fill alloc()', function() {
    const buf = Buffer.alloc(64);
    assert(Buffer.isBuffer(buf));
    assert.strictEqual(buf.length, 64);
    for (let i = 0; i < buf.length; i++)
      assert.strictEqual(buf[i], 0);
  });

  it('should support alloc() fill', function() {
    assert.deepStrictEqual(Buffer.alloc(3, 'A'), Buffer.from('AAA'));
    assert.deepStrictEqual(Buffer.alloc(2, 0xff), Buffer.from([0xff, 0xff]));
  });

  it('should reject invalid alloc() sizes', function() {
    assert.throws(() => Buffer.alloc(-1), RangeError);
    assert.throws(() => Buffer.alloc(Buffer.kMaxLength + 1));
    assert.throws(() => Buffer.alloc(Infinity), TypeError);
    assert.throws(() => Buffer.alloc(1.5), TypeError);
    assert.throws(() => Buffer.alloc(NaN), TypeError);
    assert.throws(() => Buffer.alloc('10'), TypeError);
    assert.throws(() => Buffer.alloc(1, {}), TypeError);
    assert.throws(() => Buffer.alloc(1, 'a', 'bogus'), TypeError);
  });

  it('should reject numbers in from()', function() {
    assert.throws(() => Buffer.from(100), TypeError);
  });

  it('should validate from() input', function() {
    assert.throws(() => Buffer.from('00', 'bogus'), TypeError);
    assert.throws(() => Buffer.from([256]), TypeError);
    assert.throws(() => Buffer.from([-1]), TypeError);
    assert.throws(() => Buffer.from([1.5]), TypeError);
    assert.throws(() => Buffer.from(['1']), TypeError);
    assert.throws(() => Buffer.from({ length: 10 }), TypeError);
    assert.throws(() => Buffer.from(null), TypeError);
    assert.throws(() => Buffer.from(undefined), TypeError);
  });

  it('should decode strings', function() {
    assert.deepStrictEqual(Buffer.from('0102ff', 'hex'),
      Buffer.from([1, 2, 0xff]));
    assert.deepStrictEqual(Buffer.from('AQL/', 'base64'),
      Buffer.from([1, 2, 0xff]));
    assert.strictEqual(Buffer.from('abc').toString(), 'abc');
  });

  it('should copy, not alias, buffer-like input', function() {
    const src = Buffer.from([1, 2, 3]);
    const copy = Buffer.from(src);
    src[0] = 9;
    assert.strictEqual(copy[0], 1);

    const ab = new ArrayBuffer(2);
    const fromAb = Buffer.from(ab);
    new Uint8Array(ab)[0] = 7;
    assert.strictEqual(fromAb[0], 0);

    const view = new Uint8Array([5, 6, 7, 8]).subarray(1, 3);
    assert.deepStrictEqual(Buffer.from(view), Buffer.from([6, 7]));
  });

  it('should compute byteLength', function() {
    assert.strictEqual(Buffer.byteLength('abc'), 3);
    assert.strictEqual(Buffer.byteLength('é'), 2);
    assert.throws(() => Buffer.byteLength('a', 'bogus'), TypeError);
  });
});
