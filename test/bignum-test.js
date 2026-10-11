'use strict';
const { describe, it } = require('node:test');

const assert = require('assert');
const util = require('util');
const asn1 = require('..');
const BN = asn1.bignum;

describe('bignum', function() {
  it('should construct from numbers', function() {
    assert.strictEqual(new BN(0).toString(), '0');
    assert.strictEqual(new BN(123).toString(), '123');
    assert.strictEqual(new BN(-123).toString(), '-123');
    assert.strictEqual(BN(5).toString(), '5');
    assert.strictEqual(new BN().toString(), '0');
    assert.strictEqual(new BN(Number.MAX_SAFE_INTEGER).toString(),
      '9007199254740991');
  });

  it('should reject unsafe numbers', function() {
    assert.throws(() => new BN(1.5), RangeError);
    assert.throws(() => new BN(NaN), RangeError);
    assert.throws(() => new BN(Infinity), RangeError);
    assert.throws(() => new BN(Number.MAX_SAFE_INTEGER + 1), RangeError);
  });

  it('should construct from strings', function() {
    assert.strictEqual(new BN('0102030405060708', 16).toString(16),
      '102030405060708');
    assert.strictEqual(new BN('ff', 'hex').toString(10), '255');
    assert.strictEqual(new BN('-ff', 16).toString(10), '-255');
    assert.strictEqual(new BN('12 34').toString(), '1234');
    assert.strictEqual(new BN('101', 2).toString(), '5');
    assert.strictEqual(new BN('777', 8).toString(), '511');
    assert.strictEqual(new BN('zz', 36).toString(), '1295');
    assert.strictEqual(new BN('', 16).toString(), '0');
    assert.strictEqual(new BN('-').toString(), '0');
  });

  it('should reject invalid strings', function() {
    assert.throws(() => new BN('12g', 16), /Invalid character/);
    assert.throws(() => new BN('1a'), /Invalid character/);
    assert.throws(() => new BN('2', 2), /Invalid character/);
    assert.throws(() => new BN('z', 35), /Invalid character/);
    assert.throws(() => new BN('0x10', 16), /Invalid character/);
    assert.throws(() => new BN('1', 1), RangeError);
    assert.throws(() => new BN('1', 37), RangeError);
  });

  it('should construct from bytes', function() {
    const buf = Buffer.from('0102ff', 'hex');
    assert.strictEqual(new BN(buf).toString(16), '102ff');
    assert.strictEqual(new BN(buf, 'le').toString(16), 'ff0201');
    assert.strictEqual(new BN([1, 0]).toString(), '256');
    assert.strictEqual(new BN(new Uint8Array([0x80])).toString(), '128');
    assert.strictEqual(new BN(Buffer.alloc(0)).toString(), '0');
  });

  it('should reject invalid byte input', function() {
    assert.throws(() => new BN([256]), TypeError);
    assert.throws(() => new BN([-1]), TypeError);
    assert.throws(() => new BN(['a']), TypeError);
    assert.throws(() => new BN(new Uint16Array([1])), TypeError);
    assert.throws(() => new BN({}), TypeError);
    assert.throws(() => new BN(5, 'le'), TypeError);
    assert.throws(() => new BN([1], 10, 'middle'), TypeError);
  });

  it('should support native BigInt', function() {
    const big = 2n ** 200n + 1n;
    assert.strictEqual(new BN(big).toBigInt(), big);
    assert.strictEqual(new BN(-big).toString(16),
      '-' + big.toString(16));
  });

  it('should be immutable and reuse instances', function() {
    const a = new BN(1);
    assert(Object.isFrozen(a));
    assert.strictEqual(new BN(a), a);
    assert.throws(() => {
      'use strict';
      a._value = 2n;
    }, TypeError);
  });

  it('should identify instances', function() {
    assert(BN.isBN(new BN(1)));
    assert(!BN.isBN(1));
    assert(!BN.isBN(null));
    assert(!BN.isBN({ words: [1], length: 1 }));
    assert.strictEqual(BN.BN, BN);
  });

  it('should format strings with padding', function() {
    assert.strictEqual(new BN(0).toString(16, 2), '00');
    assert.strictEqual(new BN(0xf).toString(16, 2), '0f');
    assert.strictEqual(new BN(0xfff).toString(16, 4), '0fff');
    assert.strictEqual(new BN(-0xf).toString(16, 2), '-0f');
    assert.strictEqual(new BN(5).toString(2, 8), '00000101');
    assert.strictEqual(new BN(255).toString('hex'), 'ff');
  });

  it('should serialize to JSON like bn.js', function() {
    assert.strictEqual(JSON.stringify({ a: new BN(10) }), '{"a":"0a"}');
    assert.strictEqual(JSON.stringify(new BN(0)), '"00"');
  });

  it('should inspect like bn.js', function() {
    assert.strictEqual(util.inspect(new BN(255)), '<BN: ff>');
  });

  it('should convert to numbers', function() {
    assert.strictEqual(new BN(-42).toNumber(), -42);
    assert.throws(() => new BN(2n ** 53n).toNumber(), RangeError);
  });

  it('should compute lengths', function() {
    assert.strictEqual(new BN(0).bitLength(), 0);
    assert.strictEqual(new BN(1).bitLength(), 1);
    assert.strictEqual(new BN(255).bitLength(), 8);
    assert.strictEqual(new BN(256).bitLength(), 9);
    assert.strictEqual(new BN(-256).bitLength(), 9);
    assert.strictEqual(new BN(0).byteLength(), 0);
    assert.strictEqual(new BN(256).byteLength(), 2);
  });

  it('should convert to arrays', function() {
    assert.deepStrictEqual(new BN(0).toArray(), [0]);
    assert.deepStrictEqual(new BN(0x0102).toArray(), [1, 2]);
    assert.deepStrictEqual(new BN(0x0102).toArray('le'), [2, 1]);
    assert.deepStrictEqual(new BN(0x0102).toArray('be', 4), [0, 0, 1, 2]);
    assert.deepStrictEqual(new BN(0x0102).toArray('le', 4), [2, 1, 0, 0]);
    assert.deepStrictEqual(new BN(-0x0102).toArray(), [1, 2]);
    assert.throws(() => new BN(0x010203).toArray('be', 2), RangeError);
  });

  it('should convert to buffers', function() {
    const buf = new BN(0x0102).toBuffer('be', 3);
    assert(Buffer.isBuffer(buf));
    assert.strictEqual(buf.toString('hex'), '000102');
    assert.strictEqual(new BN(0x0102).toArrayLike(Buffer).toString('hex'),
      '0102');
    const u8 = new BN(0x0102).toArrayLike(Uint8Array, 'le');
    assert(u8 instanceof Uint8Array);
    assert.deepStrictEqual(Array.from(u8), [2, 1]);
    assert.throws(() => new BN(1).toArrayLike(Float64Array), TypeError);
  });

  it('should round-trip large byte strings', function() {
    const hex = '00ff' + 'a5'.repeat(512) + '01';
    const n = new BN(Buffer.from(hex, 'hex'));
    assert.strictEqual(n.toBuffer('be', hex.length / 2).toString('hex'), hex);
  });

  it('should compare', function() {
    const a = new BN(5);
    assert.strictEqual(a.cmp(new BN(6)), -1);
    assert.strictEqual(a.cmp(5), 0);
    assert.strictEqual(a.cmp(4n), 1);
    assert(a.eq(5) && a.lt(6) && a.lte(5) && a.gt(4) && a.gte(5));
    assert(new BN(0).isZero() && new BN(-1).isNeg());
    assert(a.isOdd() && !a.isEven());
    assert.strictEqual(BN.max(a, new BN(9)).toNumber(), 9);
    assert.strictEqual(BN.min(a, new BN(9)).toNumber(), 5);
    assert.throws(() => a.cmp('5'), TypeError);
    assert.throws(() => a.cmp(1.5), TypeError);
  });

  it('should do arithmetic without mutating', function() {
    const a = new BN(7);
    assert.strictEqual(a.add(3).toNumber(), 10);
    assert.strictEqual(a.sub(10).toNumber(), -3);
    assert.strictEqual(a.mul(new BN(6)).toNumber(), 42);
    assert.strictEqual(a.div(2).toNumber(), 3);
    assert.strictEqual(a.neg().div(2).toNumber(), -3);
    assert.strictEqual(a.neg().mod(3).toNumber(), -1);
    assert.strictEqual(a.neg().umod(3).toNumber(), 2);
    assert.strictEqual(a.neg().abs().toNumber(), 7);
    assert.strictEqual(a.clone().eq(a), true);
    assert.strictEqual(a.toNumber(), 7);
    assert.throws(() => a.div(0), RangeError);
  });

  it('should round-trip through DER', function() {
    const M = asn1.define('M', function() {
      this.int();
    });
    const n = new BN('00ffeeddccbbaa99887766554433221100', 16);
    const out = M.decode(M.encode(n, 'der'), 'der');
    assert(BN.isBN(out));
    assert(out.eq(n));
  });
});
