const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const redisClient = require('../config/redis');

function getUtcDay() {
  return new Date().toISOString().slice(0, 10);
}

function getClientIp(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.ip ||
    req.connection?.remoteAddress ||
    'unknown'
  );
}

function hashIp(ip) {
  return crypto.createHash('sha256').update(String(ip)).digest('hex');
}

function getUserIdFromRequest(req) {
  if (req.user && req.user._id) return String(req.user._id);
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded && decoded._id ? String(decoded._id) : null;
  } catch (_) {
    return null;
  }
}

module.exports = async function costGuard(req, res, next) {
  try {
    const today = getUtcDay();
    const userId = getUserIdFromRequest(req);

    const userLimit = parseInt(process.env.USER_DAILY_ANALYSIS_LIMIT || '50', 10);
    const anonLimit = parseInt(process.env.ANON_DAILY_ANALYSIS_LIMIT || '5', 10);

    const key = userId
      ? `cost:user:${userId}:${today}`
      : `cost:anon:${hashIp(getClientIp(req))}:${today}`;
    const limit = userId ? userLimit : anonLimit;

    if (!redisClient.rawClient) {
      return next();
    }

    const count = await redisClient.rawClient.incr(key);
    if (count === 1) {
      await redisClient.rawClient.expire(key, 86400);
    }

    if (count > limit) {
      return res.status(429).json({
        error: 'Daily analysis limit reached',
        limit,
        resetAt: 'midnight UTC'
      });
    }

    return next();
  } catch (err) {
    console.warn('[costGuard] passthrough due to error:', err.message);
    return next();
  }
};
