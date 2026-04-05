const redis = require('../config/redis');
const crypto = require('crypto');

function hashIp(ip) {
  return crypto.createHash('sha256').update(ip).digest('hex');
}

function createRateLimiter(windowMs, max, keyPrefix) {
  return async (req, res, next) => {
    try {
      const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
      const secureIp = hashIp(ip);
      const key = `${keyPrefix}:${secureIp}`;
      
      const client = redis.rawClient;
      if (!client || client.status !== 'ready') {
        // If redis is down, act as passthrough (safe degradation instead of blocking)
        return next();
      }

      const current = await client.incr(key);
      if (current === 1) {
        // First request, set expiry
        await client.pexpire(key, windowMs);
      } else {
        // Get TTL to send Retry-After
        const ttl = await client.pttl(key);
        if (ttl === -1) {
           await client.pexpire(key, windowMs); // Failsafe
        }
      }

      if (current > max) {
        const ttl = await client.pttl(key);
        res.setHeader('Retry-After', Math.ceil(ttl / 1000));
        return res.status(429).json({
          error: 'Too many requests, please try again later.',
          retryAfter: Math.ceil(ttl / 1000)
        });
      }

      next();
    } catch (error) {
      console.error('[RateLimiter Error]', error);
      // Failsafe: permit traffic if rate limiter errors out
      next();
    }
  };
}

module.exports = {
  createRateLimiter,
  analysisLimiter: createRateLimiter(60 * 1000, 20, 'ratelimit:analysis'),           // 20 per minute
  communityReportLimiter: createRateLimiter(60 * 60 * 1000, 5, 'ratelimit:report'), // 5 per hour
  publishLimiter: createRateLimiter(24 * 60 * 60 * 1000, 10, 'ratelimit:publish')   // 10 per day
};
