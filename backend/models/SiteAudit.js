const mongoose = require('mongoose');

const PatternSchema = new mongoose.Schema({
  category: { type: String, required: true },
  confidence: { type: Number, required: true, min: 0, max: 1 },
  domSelector: { type: String },
  boundingBox: {
    x: Number,
    y: Number,
    w: Number,
    h: Number
  },
  evidenceText: { type: String },
  legalClause: { type: String }
}, { _id: false });

const SiteAuditSchema = new mongoose.Schema({
  url: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  triggeredBy: { 
    type: String, 
    enum: ['extension', 'api', 'dashboard'],
    default: 'extension'
  },
  domSnapshot: { type: mongoose.Schema.Types.Mixed },
  screenshotBase64: { type: String }, // Can be very large, typically stored in S3, but per spec keeping as String
  detectedPatterns: [PatternSchema],
  overallScore: { type: Number, min: 0, max: 100 },
  severityLevel: { 
    type: String, 
    enum: ['low', 'medium', 'high', 'pending'] 
  },
  processingTimeMs: { type: Number },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  public: { type: Boolean, default: false }
});

// Indexing for rapid historical lookups
SiteAuditSchema.index({ url: 1, timestamp: -1 });
SiteAuditSchema.index({ userId: 1, timestamp: -1 });

// ELEVATED: POLISH_3 — TTL index auto-deletes audits older than 90 days
SiteAuditSchema.index({ timestamp: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

// ELEVATED: POLISH_3 — text index enables keyword search across audited URLs
SiteAuditSchema.index({ url: 'text' });

// ELEVATED: POLISH_3 — URL normalization prevents duplicate audits for same site with different URL variants
SiteAuditSchema.pre('save', function(next) {
  if (this.url) {
    try {
      const parsed = new URL(this.url);
      // Normalize: lowercase hostname, remove trailing slash, strip default ports
      this.url = `${parsed.protocol}//${parsed.hostname}${parsed.pathname.replace(/\/+$/, '') || '/'}`;
    } catch {
      // URL is invalid — let Mongoose validation handle it
    }
  }
  next();
});

// ELEVATED: POLISH_3 — virtual field for severity-based color mapping (useful for frontend)
SiteAuditSchema.virtual('severityColor').get(function() {
  const map = { low: '#27AE60', medium: '#F39C12', high: '#E67E22', critical: '#C0392B', pending: '#808080' };
  return map[this.severityLevel] || map.pending;
});
SiteAuditSchema.set('toJSON', { virtuals: true });

// Custom Static Methods
SiteAuditSchema.statics.findByUrl = function(url, limitDays = 7) {
  const d = new Date();
  d.setDate(d.getDate() - limitDays);
  return this.find({
    url: url,
    timestamp: { $gte: d }
  }).sort({ timestamp: -1 });
};

// ELEVATED: POLISH_3 — static method for text search across audited URLs
SiteAuditSchema.statics.searchByUrl = function(query, limit = 10) {
  return this.find(
    { $text: { $search: query } },
    { score: { $meta: 'textScore' } }
  ).sort({ score: { $meta: 'textScore' } }).limit(limit).select('-domSnapshot -screenshotBase64');
};

module.exports = mongoose.model('SiteAudit', SiteAuditSchema);
