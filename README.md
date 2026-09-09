# ZeroFlood.js

A zero-dependency, hyper-optimized traffic throttling engine for Node.js backends. Implements a custom in-memory **Token Bucket algorithm** with **lazy evaluation mechanics** to mitigate automated script floods and application-layer DDoS attacks with near-zero latency overhead.

## Why ZeroFlood?

| Feature | Benefit |
|---------|---------|
| **Lazy token refill** | Only recalculates when time has actually passed — not on every request |
| **Bounded memory** | Configurable `maxBuckets` (default 100k) with LRU eviction prevents memory exhaustion under attack |
| **Fast path optimized** | Inlined hot path, cached header strings, bitwise operations — **~2.7M ops/sec** |
| **Non-mutating checks** | `tryConsume()` for read-heavy workloads without side effects |
| **Standard headers** | `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, `Retry-After` |
| **Zero dependencies** | No external packages — minimal attack surface, fast installs |

## Quick Start

```bash
npm install zeroflood
```

```js
const express = require('express');
const rateLimiter = require('zeroflood');

const app = express();

app.use(rateLimiter({
  windowMs: 60000,      // 1 minute
  maxRequests: 100,     // 100 requests per window
  message: 'Too many requests',
  skip: (req) => req.path === '/health'
}));

app.get('/', (req, res) => res.send('Protected!'));
app.listen(3000);
```

## API

### `rateLimiter(options?)`
Returns Express/Connect middleware.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `windowMs` | number | 60000 | Refill window in ms |
| `maxRequests` | number | 100 | Bucket capacity |
| `message` | string | 'Too many requests...' | Response body when limited |
| `statusCode` | number | 429 | HTTP status code |
| `headers` | boolean | true | Enable rate limit headers |
| `keyGenerator` | fn | `req => req.ip` | Custom key extractor |
| `skip` | fn | `() => false` | Skip limiting for request |
| `onLimitReached` | fn | `() => {}` | Callback when limit hit |
| `maxBuckets` | number | 100000 | Max buckets before LRU eviction |

### `rateLimiter.TokenBucket`
Direct access to the TokenBucket class for custom usage.

```js
const { TokenBucket } = require('zeroflood');
const bucket = new TokenBucket(1000, 100, 60000, 50000); // capacity, refillRate, ttl, maxBuckets

bucket.consume('user:123', 5);    // { allowed, remaining, retryAfter }
bucket.tryConsume('user:123', 5); // non-mutating check
bucket.reset('user:123');
bucket.getStats(); // { totalBuckets, capacity, refillRate, maxBuckets }
```

## Performance

```
200k consumes: 72.61 ms
Throughput: 2,754,504 ops/sec
```

## License

MIT