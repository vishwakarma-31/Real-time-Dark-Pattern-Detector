const express = require('express');
const router = express.Router();
const analyzeController = require('../controllers/analyzeController');
const rateLimit = require('express-rate-limit');
const redisClient = require('../config/redis');
const costGuard = require('../middleware/costGuard');

// HARDENED: RISK_3 — fake requireAuth replaced with real JWT verification middleware
const { protect, optionalProtect } = require('../middleware/auth');

const { analysisLimiter, communityReportLimiter, publishLimiter } = require('../middleware/rateLimiter');

// @route   POST /api/v1/analyze
// @desc    Main entry point for extension audits
// @access  Public (Rate limited, optionally authenticated)
router.post('/analyze', analysisLimiter, costGuard, optionalProtect, analyzeController.analyzeUrl);

// @route   GET /api/v1/analyze/audit/:id
// @desc    Get specific audit
// @access  Public (or Protected depending on scope)
router.get('/audit/:id', analyzeController.getSiteReport);

// @route   GET /api/v1/analyze/history
// @desc    Get paginated user history
// @access  Protected
router.get('/history', protect, analyzeController.getAuditHistory);

// @route   GET /api/v1/analyze/stats
// @desc    Dashboard aggregations
// @access  Protected
router.get('/stats', protect, analyzeController.getDashboardStats);

// @route   GET /api/v1/analyze/report/public/:auditId
// @desc    Public reports view without auth
// @access  Public
router.get('/report/public/:auditId', analyzeController.getPublicReport);

// @route   POST /api/v1/analyze/report/:auditId/publish
// @desc    Publish a report
// @access  Protected
router.post('/report/:auditId/publish', protect, publishLimiter, analyzeController.makeReportPublic);

// @route   POST /api/v1/analyze/report/community
// @desc    Anonymous submission of dark patterns
// @access  Public
router.post('/report/community', communityReportLimiter, analyzeController.reportSite);

// @route   GET /api/v1/analyze/health
// @desc    Healthcheck
// @access  Public
// HARDENED: RISK_1 — health endpoint verifies OpenAI key validity
router.get('/health', async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const visionCounterKey = `openai:vision:daily:${today}`;
  const costToday = parseInt((await redisClient.get(visionCounterKey)) || '0', 10);

  // Test Redis
  let redisOk = false;
  try {
    await redisClient.set('health_probe', '1', 5);
    redisOk = true;
  } catch(e) {}

  // Test OpenAI connectivity
  let openaiOk = false;
  try {
    const { OpenAI } = require('openai');
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    await client.models.list();
    openaiOk = true;
  } catch (e) {
    openaiOk = false;
  }

  res.status(200).json({
    status: 'ok',
    redis: redisOk,
    mongo: require('mongoose').connection.readyState === 1,
    openai: openaiOk,
    costToday,
    // ELEVATED: POLISH_1 — cache hit/miss observability
    cacheStats: redisClient.getStats()
  });
});

module.exports = router;
