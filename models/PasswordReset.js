const mongoose = require('mongoose');
const crypto = require('crypto');

const passwordResetSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  token: {
    type: String,
    required: true,
    unique: true
  },
  expiresAt: {
    type: Date,
    required: true
  },
  used: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient queries
passwordResetSchema.index({ email: 1, token: 1 });
passwordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // Auto-delete expired tokens

// Method to generate reset token
passwordResetSchema.statics.generateToken = function() {
  return crypto.randomBytes(32).toString('hex');
};

// Method to create reset token
passwordResetSchema.statics.createResetToken = async function(email) {
  // Delete any existing tokens for this email
  await this.deleteMany({ email });
  
  // Create new token
  const token = this.generateToken();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now
  
  const resetToken = new this({
    email,
    token,
    expiresAt
  });
  
  await resetToken.save();
  return resetToken;
};

// Method to verify token
passwordResetSchema.statics.verifyToken = async function(email, token) {
  const resetToken = await this.findOne({
    email,
    token,
    used: false,
    expiresAt: { $gt: new Date() }
  });
  
  return resetToken;
};

// Method to mark token as used
passwordResetSchema.methods.markAsUsed = function() {
  this.used = true;
  return this.save();
};

module.exports = mongoose.model('PasswordReset', passwordResetSchema); 