const mongoose = require('mongoose');

const CommunityReportSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: [
      'fake_countdown',
      'hidden_cost',
      'roach_motel',
      'trick_question',
      'forced_continuity',
      'confirm_shaming'
    ]
  },
  description: {
    type: String,
    required: true
  },
  screenshotBase64: {
    type: String,
    default: null
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  hashedIp: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'confirmed', 'rejected'],
    default: 'pending'
  },
  reviewNotes: {
    type: String,
    default: ''
  }
});

// Index for deduplication queries
CommunityReportSchema.index({ url: 1, category: 1 });

// ELEVATED: POLISH_3 — TTL auto-cleans unreviewed community reports after 30 days
CommunityReportSchema.index({ submittedAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60, partialFilterExpression: { status: 'pending' } });

module.exports = mongoose.model('CommunityReport', CommunityReportSchema);
