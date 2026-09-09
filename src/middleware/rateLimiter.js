const TokenBucket = require('../tokenBucket');

const DEFAULT_WINDOW_MS = 60000;
const DEFAULT_MAX_REQUESTS = 100;

function createRateLimiter(options = {}) {
  const windowMs = options.windowMs ?? DEFAULT_WINDOW_MS;
  const maxRequests = options.maxRequests ?? DEFAULT_MAX_REQUESTS;
  const message = options.message ?? 'Too many requests, please try again later.';
  const statusCode = options.statusCode ?? 429;
  const headers = options.headers !== false;
  const keyGenerator = options.keyGenerator ?? ((req) => req.ip);
  const skip = options.skip ?? (() => false);
  const onLimitReached = options.onLimitReached ?? (() => {});
  const maxBuckets = options.maxBuckets ?? 100000;

  const refillRate = maxRequests / (windowMs / 1000);
  const bucket = new TokenBucket(maxRequests, refillRate, windowMs, maxBuckets);

  const headerLimit = 'X-RateLimit-Limit';
  const headerRemaining = 'X-RateLimit-Remaining';
  const headerReset = 'X-RateLimit-Reset';
  const headerRetryAfter = 'Retry-After';

  return (req, res, next) => {
    if (skip(req, res)) return next();

    const key = keyGenerator(req);
    const result = bucket.consume(key);

    if (headers) {
      res.setHeader(headerLimit, maxRequests);
      res.setHeader(headerRemaining, result.remaining);
      res.setHeader(headerReset, ((Date.now() + result.retryAfter) / 1000) | 0);
    }

    if (result.allowed) return next();

    onLimitReached(req, res, options);

    if (headers) {
      res.setHeader(headerRetryAfter, (result.retryAfter / 1000) | 0);
    }

    const send = res.send || res.end;
    if (typeof res.status === 'function') {
      res.status(statusCode).send(message);
    } else {
      res.writeHead(statusCode, { 'Content-Type': 'text/plain' });
      res.end(message);
    }
  };
}

createRateLimiter.TokenBucket = TokenBucket;

module.exports = createRateLimiter;