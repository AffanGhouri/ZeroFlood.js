class TokenBucket {
  constructor(capacity, refillRate, ttl = 30000, maxBuckets = 100000) {
    this.capacity = capacity;
    this.refillRate = refillRate;
    this.ttl = ttl;
    this.maxBuckets = maxBuckets;
    this.buckets = new Map();
    this.accessOrder = new Map();
    this.accessCounter = 0;
    this.cleanupInterval = null;
    this.startCleanup();
  }

  startCleanup() {
    this.cleanupInterval = setInterval(() => this.sweep(), this.ttl);
    this.cleanupInterval.unref();
  }

  stopCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  sweep() {
    const now = Date.now();
    const expiry = now - this.ttl;
    for (const [key, bucket] of this.buckets.entries()) {
      if (bucket.lastRefill < expiry) {
        this.buckets.delete(key);
        this.accessOrder.delete(key);
      }
    }
    if (this.buckets.size > this.maxBuckets) {
      this.evictLRU(this.buckets.size - this.maxBuckets);
    }
  }

  evictLRU(count) {
    const entries = [...this.accessOrder.entries()];
    entries.sort((a, b) => a[1] - b[1]);
    for (let i = 0; i < count && i < entries.length; i++) {
      const key = entries[i][0];
      this.buckets.delete(key);
      this.accessOrder.delete(key);
    }
  }

  getBucket(key) {
    const now = Date.now();
    let bucket = this.buckets.get(key);

    if (!bucket) {
      if (this.buckets.size >= this.maxBuckets) {
        this.evictLRU(1);
      }
      bucket = { tokens: this.capacity, lastRefill: now };
      this.buckets.set(key, bucket);
      this.accessOrder.set(key, this.accessCounter++);
      return bucket;
    }

    this.accessOrder.set(key, this.accessCounter++);

    const elapsed = now - bucket.lastRefill;
    if (elapsed > 0) {
      const refillAmount = (elapsed / 1000) * this.refillRate;
      bucket.tokens = Math.min(this.capacity, bucket.tokens + refillAmount);
      bucket.lastRefill = now;
    }

    return bucket;
  }

  consume(key, tokens = 1) {
    const bucket = this.getBucket(key);

    if (bucket.tokens >= tokens) {
      bucket.tokens -= tokens;
      return {
        allowed: true,
        remaining: bucket.tokens | 0,
        retryAfter: 0
      };
    }

    const tokensNeeded = tokens - bucket.tokens;
    const retryAfter = Math.ceil((tokensNeeded / this.refillRate) * 1000);

    return {
      allowed: false,
      remaining: 0,
      retryAfter
    };
  }

  tryConsume(key, tokens = 1) {
    const bucket = this.buckets.get(key);
    if (!bucket) {
      return { allowed: true, remaining: this.capacity - tokens, retryAfter: 0 };
    }

    const now = Date.now();
    const elapsed = now - bucket.lastRefill;
    let currentTokens = bucket.tokens;

    if (elapsed > 0) {
      const refillAmount = (elapsed / 1000) * this.refillRate;
      currentTokens = Math.min(this.capacity, currentTokens + refillAmount);
    }

    if (currentTokens >= tokens) {
      return { allowed: true, remaining: (currentTokens - tokens) | 0, retryAfter: 0 };
    }

    const tokensNeeded = tokens - currentTokens;
    return { allowed: false, remaining: 0, retryAfter: Math.ceil((tokensNeeded / this.refillRate) * 1000) };
  }

  reset(key) {
    this.buckets.delete(key);
    this.accessOrder.delete(key);
  }

  getStats() {
    return {
      totalBuckets: this.buckets.size,
      capacity: this.capacity,
      refillRate: this.refillRate,
      maxBuckets: this.maxBuckets
    };
  }
}

module.exports = TokenBucket;