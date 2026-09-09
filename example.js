const express = require('express');
const rateLimiter = require('./src/middleware/rateLimiter');

const app = express();

app.use(rateLimiter({
  windowMs: 60000,
  maxRequests: 100,
  message: 'Too many requests, please try again later.',
  statusCode: 429,
  headers: true,
  keyGenerator: (req) => req.ip,
  skip: (req) => req.path === '/health'
}));

app.get('/', (req, res) => {
  res.status(200).send('Gateway Secure.');
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/api/users', (req, res) => {
  res.status(200).json([{ id: 1, name: 'User 1' }]);
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('ZeroFlood.js rate limiter active');
});