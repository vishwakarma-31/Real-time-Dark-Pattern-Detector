const SiteAudit = require('../models/SiteAudit');
const analyzeService = require('../services/analyzeService');
const redisClient = require('../config/redis');
const { emitToSession } = require('../services/websocketService');

// ELEVATED: Extracted cache key generation for consistency
const getAuditCacheKey = (url) => `audit:${url}`;

exports.analyzeUrl = async (req, res) => {
  const { url, domSnapshot, screenshotBase64, sessionId } = req.body;
  const startMs = Date.now();

  // HARDENED: RISK_2 — server-side screenshot size guard
  const MAX_SCREENSHOT_BYTES = 3 * 1024 * 1024; // 3MB base64
  let safeScreenshot = screenshotBase64;
  if (screenshotBase64 && Buffer.byteLength(screenshotBase64, 'utf8') > MAX_SCREENSHOT_BYTES) {
    console.warn(`[analyzeController] Screenshot too large (${Math.round(Buffer.byteLength(screenshotBase64, 'utf8') / 1024)}KB), dropping visual detector`);
    safeScreenshot = null;
  }

  try {
    // 1. Check Redis Cache
    const cacheKey = getAuditCacheKey(url);
    const cachedData = await redisClient.get(cacheKey);
    
    if (cachedData) {
      if (sessionId) emitToSession(sessionId, 'fusion_complete', JSON.parse(cachedData));
      return res.status(200).json({ cached: true, ...JSON.parse(cachedData) });
    }

    // 2. Cache Miss -> Run analysis synchronously, return full result
    if (sessionId) emitToSession(sessionId, 'analysis_started', { url });

    // 3. Save pending audit to DB
    const audit = new SiteAudit({
      url,
      triggeredBy: 'extension',
      domSnapshot,
      severityLevel: 'pending',
      userId: req.user ? req.user._id : null
    });
    await audit.save();

    // 4. Run detectors via service
    const results = await analyzeService.runAllDetectors({
      url, sessionId, domSnapshot, screenshotBase64: safeScreenshot
    });

    // 5. Update DB
    audit.detectedPatterns = results.patterns;
    audit.overallScore = results.overallScore;
    audit.severityLevel = results.overallScore >= 70 ? 'high' : (results.overallScore >= 30 ? 'medium' : 'low');
    audit.processingTimeMs = Date.now() - startMs;
    // Omit saving screenshotBase64 back to DB to save space in prod, string gets heavy
    await audit.save();

    // 6. Save back to Redis
    const payloadToCache = {
      overallScore: audit.overallScore,
      severityLevel: audit.severityLevel,
      patterns: audit.detectedPatterns,
      timestamp: audit.timestamp
    };
    
    const ttl = process.env.ANALYSIS_CACHE_TTL || 600;
    await redisClient.set(cacheKey, JSON.stringify(payloadToCache), ttl);

    // 7. Emit final result via WS
    if (sessionId) emitToSession(sessionId, 'fusion_complete', payloadToCache);

    // FIXED: BLOCKER_4 — HTTP response returns full result synchronously. WebSocket still fires for streaming. Extension has both channels.
    return res.status(200).json({
      cached: false,
      overallScore: audit.overallScore,
      severityLevel: audit.severityLevel,
      patterns: audit.detectedPatterns,
      timestamp: audit.timestamp,
      auditId: audit._id
    });

  } catch (error) {
    console.error(`[analyzeController] Error processing ${url}:`, error);
    if (sessionId) emitToSession(sessionId, 'analysis_error', { message: error.message });
    if (!res.headersSent) res.status(500).json({ error: "Analysis failed." });
  }
};

exports.getAuditHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    const history = await SiteAudit.find({ userId })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .select('-domSnapshot -screenshotBase64'); // Save bandwidth

    const total = await SiteAudit.countDocuments({ userId });
    
    res.status(200).json({
      history,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch history" });
  }
};

exports.getSiteReport = async (req, res) => {
  try {
    const audit = await SiteAudit.findById(req.params.id);
    if (!audit) return res.status(404).json({ error: "Audit not found" });
    res.status(200).json(audit);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.getDashboardStats = async (req, res) => {
  try {
    const cacheKey = "stats:dashboard:all";
    const cachedStats = await redisClient.get(cacheKey);
    if (cachedStats) return res.status(200).json(JSON.parse(cachedStats));

    const totalAudits = await SiteAudit.estimatedDocumentCount();
    
    // Unique sites
    const uniqueSitesAgg = await SiteAudit.aggregate([{ $group: { _id: "$url" } }, { $count: "count" }]);
    const uniqueSites = uniqueSitesAgg.length > 0 ? uniqueSitesAgg[0].count : 0;

    // Averages and critical sites
    const scoreAgg = await SiteAudit.aggregate([
      { $match: { overallScore: { $exists: true } } },
      { $group: { _id: null, avg: { $avg: "$overallScore" }, critical: { $sum: { $cond: [{ $gt: ["$overallScore", 80] }, 1, 0] } } } }
    ]);
    const averageScore = scoreAgg.length > 0 ? scoreAgg[0].avg : 0;
    const criticalSites = scoreAgg.length > 0 ? scoreAgg[0].critical : 0;

    // Pattern Frequency
    const patternAgg = await SiteAudit.aggregate([
      { $unwind: "$detectedPatterns" },
      { $group: { _id: "$detectedPatterns.category", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    const mostCommonPattern = patternAgg.length > 0 ? patternAgg[0]._id : null;
    const categoryFrequency = {};
    patternAgg.forEach(p => { categoryFrequency[p._id] = p.count; });

    // Recent Activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentActivityAgg = await SiteAudit.aggregate([
      { $match: { timestamp: { $gte: thirtyDaysAgo } } },
      { $group: { 
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
          count: { $sum: 1 },
          avgScore: { $avg: "$overallScore" }
        } 
      },
      { $sort: { _id: 1 } }
    ]);
    
    const recentActivity = recentActivityAgg.map(r => ({ date: r._id, count: r.count, avgScore: r.avgScore }));

    // Heatmap data inference
    const heatmapData = {
      bySiteCategory: { ecommerce: {}, travel: {}, streaming: {}, fintech: {}, edtech: {}, food_delivery: {}, other: {} },
      byDay: recentActivity.map(r => ({ date: r.date, count: r.count }))
    };
    
    // Simple logic to classify domains for heatmap (simulated by querying domains)
    const domainClassAgg = await SiteAudit.aggregate([
      { $unwind: "$detectedPatterns" },
      { $group: { 
          _id: { url: "$url", category: "$detectedPatterns.category" },
          count: { $sum: 1 }
      }}
    ]);
    
    domainClassAgg.forEach(item => {
       const url = (item._id.url || '').toLowerCase();
       let siteCat = 'other';
       if (url.includes('amazon') || url.includes('flipkart') || url.includes('myntra') || url.includes('meesho')) siteCat = 'ecommerce';
       else if (url.includes('booking') || url.includes('makemytrip') || url.includes('agoda') || url.includes('oyo')) siteCat = 'travel';
       else if (url.includes('netflix') || url.includes('hotstar') || url.includes('prime')) siteCat = 'streaming';
       else if (url.includes('paytm') || url.includes('phonepe') || url.includes('groww')) siteCat = 'fintech';
       else if (url.includes('zomato') || url.includes('swiggy')) siteCat = 'food_delivery';
       else if (url.includes('byju') || url.includes('coursera') || url.includes('udemy')) siteCat = 'edtech';
       
       if (!heatmapData.bySiteCategory[siteCat][item._id.category]) {
           heatmapData.bySiteCategory[siteCat][item._id.category] = 0;
       }
       heatmapData.bySiteCategory[siteCat][item._id.category] += item.count;
    });

    // FIXED: BROKEN_3 — worstSites query added to getDashboardStats
    const worstSites = await SiteAudit.find({ overallScore: { $exists: true, $ne: null } })
      .sort({ overallScore: -1 })
      .limit(5)
      .select('url overallScore severityLevel timestamp')
      .lean();

    const stats = { totalAudits, uniqueSites, averageScore, criticalSites, mostCommonPattern, categoryFrequency, heatmapData, recentActivity, worstSites };
    await redisClient.set(cacheKey, JSON.stringify(stats), 300);

    res.status(200).json(stats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
};

const CommunityReport = require('../models/CommunityReport');

exports.getPublicReport = async (req, res) => {
  try {
    const audit = await SiteAudit.findById(req.params.auditId).select('-userId');
    if (!audit || !audit.public) {
      return res.status(404).json({ error: "Report not found or not public." });
    }
    res.status(200).json(audit);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.makeReportPublic = async (req, res) => {
  try {
    const audit = await SiteAudit.findOne({ _id: req.params.auditId, userId: req.user._id });
    if (!audit) return res.status(404).json({ error: "Report not found or you lack ownership." });
    
    audit.public = true;
    await audit.save();
    
    res.status(200).json({ message: "Report is now public", publicUrl: `/report/public/${audit._id}` });
  } catch (err) {
    res.status(500).json({ error: "Failed to publish report" });
  }
};

exports.reportSite = async (req, res) => {
  try {
    const { url, category, description, screenshotBase64 } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
    const crypto = require('crypto');
    const hashedIp = crypto.createHash('sha256').update(ip).digest('hex');
    
    const report = new CommunityReport({
      url, category, description, screenshotBase64, hashedIp, status: 'pending'
    });
    await report.save();
    
    res.status(201).json({ message: "Report submitted successfully." });
  } catch (err) {
    res.status(500).json({ error: "Failed to submit report" });
  }
};
