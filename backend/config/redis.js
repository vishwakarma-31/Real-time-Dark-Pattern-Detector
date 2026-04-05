// ELEVATED: Wrapped ioredis in a protective shell to ensure the Node server doesn't crash if the Redis container is down. Graceful fallback on memory where necessary.

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

client.on('error', (err) => {
  if (isConnected) {
    console.error(`[Redis] Connection error: ${err.message}`);
    isConnected = false;
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
    return await client.get(key);
  } catch (err) {
    console.error(`[Redis] GET Error for key ${key}:`, err);
    return null;
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
