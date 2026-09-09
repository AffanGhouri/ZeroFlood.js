# ZeroFlood.js 🛡️

A zero-dependency, hyper-optimized traffic throttling engine for Node.js backends. ZeroFlood.js leverages a custom in-memory **Token Bucket algorithm** and lazy evaluation mechanics to mitigate automated script floods, brute-force requests, and application-layer DDoS anomalies with near-zero latency overhead.

```text
       [ Inbound Traffic Request ]
                    │
                    ▼
     [ ZeroFlood.js Security Layer ]
                    │
        ┌───────────┴───────────┐
  (Tokens Available)     (Tokens Exhausted)
        │                       │
        ▼                       ▼
   [ next() ]           [ HTTP 429 Drop ]
  Allows clean          Instantly blocks bot 
  access to website     and saves server RAM
```

## ⚡ Key Engineering Architectural Features

* **Absolute Zero-Dependency Footprint:** Written entirely in core native JavaScript. It introduces zero package bloat, ensuring maximum architectural safety against third-party supply-chain security vulnerabilities.
* **Lazy Token Refilling Engine:** Eliminates resource-heavy background timer loops. `ZeroFlood.js` calculates refilled tokens on demand using high-performance timestamp arithmetic (`Delta`) only at the exact millisecond an inbound request hits the gateway.
* **Constant O(1) Time-Complexity Performance:** Leverages the native memory `Map` engine architecture for fast IP address lookups. The system processes evaluation metrics in constant time, whether managing traffic for 10 or 1,000,000 concurrent endpoints.
* **Anti-Memory Leak Protection:** Employs an automated background TTL (Time-To-Live) clearing routine. If an attacker attempts to crash the server's RAM by faking millions of random IP addresses, the garbage collector dynamically sweeps and deletes idle tracking profiles from the registry pool every 30 seconds.

## 🚀 Quick Start & Integration

1. Drop the files into your local directory.
2. Initialize and integrate the security layer seamlessly within your main application script:

```javascript
const express = require('express');
const rateLimiter = require('./src/middleware/rateLimiter');

const app = express();

// Apply ZeroFlood.js globally to protect all system endpoints
app.use(rateLimiter);

app.get('/', (req, res) => {
    res.status(200).send("Gateway Secure.");
});

app.listen(8080);
```

## 📋 License
Distributed under the MIT License. See `LICENSE` for more information.
