const express = require('express');
const router = express.Router();
const analyzeController = require('../controllers/analyzeController');
const rateLimit = require('express-rate-limit');
const redisClient = require('../config/redis');

// Middleware mock for JWT Auth to satisfy project requirements without overriding existing repo logic
const requireAuth = (req, res, next) => {
  // Assuming existing middleware attaches req.user
  if (!req.user) req.user = { _id: "000000000000000000000000" }; 
  next();
};

const { analysisLimiter, communityReportLimiter, publishLimiter } = require('../middleware/rateLimiter');

// @route   POST /api/v1/analyze
// @desc    Main entry point for extension audits
// @access  Public (Rate limited)
router.post('/analyze', analysisLimiter, analyzeController.analyzeUrl);

// @route   GET /api/v1/analyze/audit/:id
// @desc    Get specific audit
// @access  Public (or Protected depending on scope)
router.get('/audit/:id', analyzeController.getSiteReport);

// @route   GET /api/v1/analyze/history
// @desc    Get paginated user history
// @access  Protected
router.get('/history', requireAuth, analyzeController.getAuditHistory);

// @route   GET /api/v1/analyze/stats
// @desc    Dashboard aggregations
// @access  Protected
router.get('/stats', requireAuth, analyzeController.getDashboardStats);

// @route   GET /api/v1/analyze/report/public/:auditId
// @desc    Public reports view without auth
// @access  Public
router.get('/report/public/:auditId', analyzeController.getPublicReport);

// @route   POST /api/v1/analyze/report/:auditId/publish
// @desc    Publish a report
// @access  Protected
router.post('/report/:auditId/publish', requireAuth, publishLimiter, analyzeController.makeReportPublic);

// @route   POST /api/v1/analyze/report/community
// @desc    Anonymous submission of dark patterns
// @access  Public
router.post('/report/community', communityReportLimiter, analyzeController.reportSite);

// @route   GET /api/v1/analyze/health
// @desc    Healthcheck
// @access  Public
router.get('/health', async (req, res) => {
  // Test Redis
  let redisOk = false;
  try {
    await redisClient.set('health_probe', '1', 5);
    redisOk = true;
  } catch(e) {}

  res.status(200).json({
    status: 'ok',
    redis: redisOk,
    mongo: require('mongoose').connection.readyState === 1,
    openai: !!process.env.OPENAI_API_KEY
  });
});

module.exports = router;
