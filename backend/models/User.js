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
    trim: true,
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
    type: Date,
    default: null
  }
});

UserSchema.index({ email: 1 }, { unique: true });

UserSchema.pre('save', async function preSave(next) {
  if (!this.isModified('passwordHash')) {
    return next();
  }

  try {
    if (!this.passwordHash.startsWith('$2b$')) {
      this.passwordHash = await bcrypt.hash(this.passwordHash, 10);
    }
    return next();
  } catch (err) {
    return next(err);
  }
});

UserSchema.statics.findByCredentials = async function findByCredentials(email, password) {
  const normalizedEmail = String(email).trim().toLowerCase();
  const user = await this.findOne({ email: normalizedEmail });
  if (!user) {
    throw new Error('Invalid credentials');
  }

  const matches = await bcrypt.compare(password, user.passwordHash);
  if (!matches) {
    throw new Error('Invalid credentials');
  }
  return user;
};

module.exports = mongoose.model('User', UserSchema);
