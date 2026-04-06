const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  name: {
    type: String,
    trim: true
  },
  organization: {
    type: String,
    default: ''
  },
  role: {
    type: String,
    enum: ['admin', 'user'],
    default: 'user'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date
  }
});

UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ createdAt: 1 });

UserSchema.pre('save', async function preSave(next) {
  if (!this.isModified('passwordHash')) {
    return next();
  }

  try {
    this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
    return next();
  } catch (err) {
    return next(err);
  }
});

UserSchema.statics.findByCredentials = async function findByCredentials(email, password) {
  const normalizedEmail = String(email).trim().toLowerCase();
  const user = await this.findOne({ email: normalizedEmail });
  if (!user) {
    return null;
  }

  const matches = await bcrypt.compare(password, user.passwordHash);
  return matches ? user : null;
};

module.exports = mongoose.model('User', UserSchema);
