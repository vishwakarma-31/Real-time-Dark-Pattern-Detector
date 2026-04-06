// ELEVATED: POLISH_2 — standard rate limit headers, proper IP extraction, abuse detection with 1-hour ban

const redis = require('../config/redis');
const crypto = require('crypto');

function hashIp(ip) {
  return crypto.createHash('sha256').update(ip).digest('hex');
}

// ELEVATED: POLISH_2 — proper IP extraction from x-forwarded-for chain
function extractClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const firstIp = forwarded.split(',')[0].trim();
    return firstIp;
  }
  return req.connection?.remoteAddress || req.socket?.remoteAddress || 'unknown';
}

const ABUSE_MULTIPLIER = 5;

async function checkAbuseBan(ip, client) {
  try {
    const abuseKey = `abuse:${hashIp(ip)}`;
    const isBanned = await client.get(abuseKey);
    return !!isBanned;
  } catch {
    return false;
  }
}

async function recordAbuse(ip, client) {
  try {
    const abuseKey = `abuse:${hashIp(ip)}`;
    await client.set(abuseKey, '1', 'EX', 3600); // 1-hour ban
    console.warn(`[RateLimiter] Abuse detected and banned for 1 hour: ${hashIp(ip).slice(0, 12)}...`);
  } catch { /* ignore redis errors for abuse tracking */ }
}

function createRateLimiter(windowMs, max, keyPrefix) {
  return async (req, res, next) => {
    try {
      const ip = extractClientIp(req);
      const secureIp = hashIp(ip);
      const key = `${keyPrefix}:${secureIp}`;
      
      const client = redis.rawClient;
      if (!client || client.status !== 'ready') {
        // If redis is down, act as passthrough (safe degradation instead of blocking)
        return next();
      }

      // Check if IP is abuse-banned before processing
      const isBanned = await checkAbuseBan(ip, client);
      if (isBanned) {
        return res.status(429).json({ error: 'Access temporarily suspended due to abuse.', retryAfter: 3600 });
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

      // ELEVATED: POLISH_2 — standard rate limit headers on every response
      res.setHeader('RateLimit-Limit', max);
      res.setHeader('RateLimit-Remaining', Math.max(0, max - current));
      res.setHeader('RateLimit-Policy', `${max};w=${Math.ceil(windowMs / 1000)}`);

      if (current > max) {
        const ttl = await client.pttl(key);
        res.setHeader('Retry-After', Math.ceil(ttl / 1000));

        // Check for abuse — if exceeding 5x the limit, ban for 1 hour
        if (current > max * ABUSE_MULTIPLIER) {
          await recordAbuse(ip, client);
        }

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
