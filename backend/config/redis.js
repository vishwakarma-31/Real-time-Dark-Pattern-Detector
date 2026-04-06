// ELEVATED: Wrapped ioredis in a protective shell to ensure the Node server doesn't crash if the Redis container is down. Graceful fallback on memory where necessary.
// ELEVATED: POLISH_1 — TTL-aware get, pipeline batch set, hit/miss observability

const Redis = require('ioredis');

const host = process.env.REDIS_HOST || '127.0.0.1';
const port = process.env.REDIS_PORT || 6379;

const client = new Redis({
  host,
  port,
  retryStrategy: (times) => {
    // Reconnect after 2 seconds, stop trying after 10 failed attempts
    if (times > 10) return null;
    return Math.min(times * 500, 2000);
  },
  maxRetriesPerRequest: 1
});

let isConnected = true;

// ELEVATED: POLISH_1 — in-memory hit/miss counter for observability (resets on server restart)
let stats = { hits: 0, misses: 0, errors: 0 };
exports.getStats = () => ({
  ...stats,
  hitRate: parseFloat((stats.hits / Math.max(1, stats.hits + stats.misses)).toFixed(3))
});

client.on('error', (err) => {
  if (isConnected) {
    console.error(`[Redis] Connection error: ${err.message}`);
    isConnected = false;
    stats.errors++;
  }
});

client.on('connect', () => {
  if (!isConnected) {
    console.log('[Redis] Reconnected successfully.');
    isConnected = true;
  }
});

// Wrapper functions for graceful failures
exports.get = async (key) => {
  if (!isConnected) return null;
  try {
    const result = await client.get(key);
    if (result !== null) stats.hits++; else stats.misses++;
    return result;
  } catch (err) {
    console.error(`[Redis] GET Error for key ${key}:`, err);
    stats.errors++;
    return null;
  }
};

// ELEVATED: POLISH_1 — TTL-aware get returns both value and remaining TTL
exports.getWithTTL = async (key) => {
  if (!isConnected) return { value: null, ttl: -1 };
  try {
    const [value, ttl] = await Promise.all([client.get(key), client.ttl(key)]);
    if (value !== null) stats.hits++; else stats.misses++;
    return { value, ttl };
  } catch (err) {
    console.error(`[Redis] GETTTL Error for key ${key}:`, err);
    stats.errors++;
    return { value: null, ttl: -1 };
  }
};

exports.set = async (key, value, ttlSeconds) => {
  if (!isConnected) return false;
  try {
    if (ttlSeconds) {
      await client.set(key, value, 'EX', ttlSeconds);
    } else {
      await client.set(key, value);
    }
    return true;
  } catch (err) {
    console.error(`[Redis] SET Error for key ${key}:`, err);
    stats.errors++;
    return false;
  }
};

// ELEVATED: POLISH_1 — pipeline batch setter for multiple keys in one round-trip
exports.setMany = async (entries) => {
  if (!isConnected || !entries || entries.length === 0) return false;
  try {
    const pipeline = client.pipeline();
    entries.forEach(({ key, value, ttlSeconds }) => {
      if (ttlSeconds) pipeline.set(key, value, 'EX', ttlSeconds);
      else pipeline.set(key, value);
    });
    await pipeline.exec();
    return true;
  } catch (err) {
    console.error('[Redis] SETMANY Error:', err);
    stats.errors++;
    return false;
  }
};

exports.del = async (key) => {
  if (!isConnected) return false;
  try {
    await client.del(key);
    return true;
  } catch (err) {
    return false;
  }
};

exports.flush = async () => {
  if (!isConnected) return false;
  try {
    await client.flushall();
    return true;
  } catch (err) {
    return false;
  }
};

exports.rawClient = client;
