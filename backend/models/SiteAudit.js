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

// Custom Static Methods
SiteAuditSchema.statics.findByUrl = function(url, limitDays = 7) {
  const d = new Date();
  d.setDate(d.getDate() - limitDays);
  return this.find({
    url: url,
    timestamp: { $gte: d }
  }).sort({ timestamp: -1 });
};

module.exports = mongoose.model('SiteAudit', SiteAuditSchema);
