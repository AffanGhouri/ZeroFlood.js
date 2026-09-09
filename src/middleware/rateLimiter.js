const TokenBucket = require('../tokenBucket');

const defaultOptions = {
  windowMs: 60000,
  maxRequests: 100,
  message: 'Too many requests, please try again later.',
  statusCode: 429,
  headers: true,
  keyGenerator: (req) => req.ip,
  skip: () => false,
  onLimitReached: () => {}
};

function rateLimiter(options = {}) {
  const opts = { ...defaultOptions, ...options };
  const refillRate = opts.maxRequests / (opts.windowMs / 1000);
  const bucket = new TokenBucket(opts.maxRequests, refillRate, opts.windowMs);

  return (req, res, next) => {
    if (opts.skip(req, res)) {
      return next();
    }

    const key = opts.keyGenerator(req);
    const result = bucket.consume(key);

    if (opts.headers) {
      res.setHeader('X-RateLimit-Limit', opts.maxRequests);
      res.setHeader('X-RateLimit-Remaining', result.remaining);
      res.setHeader('X-RateLimit-Reset', Math.ceil((Date.now() + result.retryAfter) / 1000));
    }

    if (result.allowed) {
      return next();
    }

    opts.onLimitReached(req, res, opts);

    if (opts.headers) {
      res.setHeader('Retry-After', Math.ceil(result.retryAfter / 1000));
    }

    if (typeof res.status === 'function' && typeof res.send === 'function') {
      res.status(opts.statusCode).send(opts.message);
    } else {
      res.writeHead(opts.statusCode, { 'Content-Type': 'text/plain' });
      res.end(opts.message);
    }
  };
}

rateLimiter.TokenBucket = TokenBucket;

module.exports = rateLimiter;