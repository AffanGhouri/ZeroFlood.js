const { test, describe, beforeEach, after } = require('node:test');
const assert = require('node:assert');
const TokenBucket = require('../src/tokenBucket');

describe('TokenBucket', () => {
  let bucket;

  beforeEach(() => {
    bucket = new TokenBucket(10, 5, 1000);
  });

  after(() => {
    bucket.stopCleanup();
  });

  test('should allow requests within capacity', () => {
    const result = bucket.consume('test-key', 5);
    assert.strictEqual(result.allowed, true);
    assert.strictEqual(result.remaining, 5);
  });

  test('should deny requests exceeding capacity', () => {
    bucket.consume('test-key', 10);
    const result = bucket.consume('test-key', 1);
    assert.strictEqual(result.allowed, false);
    assert.strictEqual(result.remaining, 0);
    assert.ok(result.retryAfter > 0);
  });

  test('should refill tokens over time', async () => {
    bucket.consume('test-key', 10);
    await new Promise(resolve => setTimeout(resolve, 250));
    const result = bucket.consume('test-key', 1);
    assert.strictEqual(result.allowed, true);
  });

  test('should track separate buckets per key', () => {
    bucket.consume('key1', 10);
    const result1 = bucket.consume('key1', 1);
    const result2 = bucket.consume('key2', 1);
    
    assert.strictEqual(result1.allowed, false);
    assert.strictEqual(result2.allowed, true);
  });

  test('should reset bucket for key', () => {
    bucket.consume('test-key', 10);
    bucket.reset('test-key');
    const result = bucket.consume('test-key', 1);
    assert.strictEqual(result.allowed, true);
    assert.strictEqual(result.remaining, 9);
  });

  test('should return correct stats', () => {
    bucket.consume('key1', 1);
    bucket.consume('key2', 1);
    const stats = bucket.getStats();
    assert.strictEqual(stats.totalBuckets, 2);
    assert.strictEqual(stats.capacity, 10);
    assert.strictEqual(stats.refillRate, 5);
  });
});

describe('Rate Limiter Middleware', () => {
  const rateLimiter = require('../src/middleware/rateLimiter');

  test('should export middleware function', () => {
    assert.strictEqual(typeof rateLimiter, 'function');
  });

  test('should export TokenBucket class', () => {
    assert.strictEqual(typeof rateLimiter.TokenBucket, 'function');
  });

  test('should create middleware with defaults', () => {
    const middleware = rateLimiter();
    assert.strictEqual(typeof middleware, 'function');
  });

  test('should create middleware with custom options', () => {
    const middleware = rateLimiter({
      windowMs: 30000,
      maxRequests: 50,
      message: 'Custom message'
    });
    assert.strictEqual(typeof middleware, 'function');
  });
});