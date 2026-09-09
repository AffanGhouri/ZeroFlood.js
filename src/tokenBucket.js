class TokenBucket {
  constructor(capacity, refillRate, ttl = 30000) {
    this.capacity = capacity;
    this.refillRate = refillRate;
    this.ttl = ttl;
    this.buckets = new Map();
    this.cleanupInterval = null;
    this.startCleanup();
  }

  startCleanup() {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, bucket] of this.buckets.entries()) {
        if (now - bucket.lastRefill > this.ttl) {
          this.buckets.delete(key);
        }
      }
    }, this.ttl);
    this.cleanupInterval.unref();
  }

  stopCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  getBucket(key) {
    const now = Date.now();
    let bucket = this.buckets.get(key);

    if (!bucket) {
      bucket = {
        tokens: this.capacity,
        lastRefill: now
      };
      this.buckets.set(key, bucket);
      return bucket;
    }

    const elapsed = now - bucket.lastRefill;
    const refillAmount = (elapsed / 1000) * this.refillRate;
    bucket.tokens = Math.min(this.capacity, bucket.tokens + refillAmount);
    bucket.lastRefill = now;

    return bucket;
  }

  consume(key, tokens = 1) {
    const bucket = this.getBucket(key);
    
    if (bucket.tokens >= tokens) {
      bucket.tokens -= tokens;
      return {
        allowed: true,
        remaining: Math.floor(bucket.tokens),
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

  reset(key) {
    this.buckets.delete(key);
  }

  getStats() {
    return {
      totalBuckets: this.buckets.size,
      capacity: this.capacity,
      refillRate: this.refillRate
    };
  }
}

module.exports = TokenBucket;