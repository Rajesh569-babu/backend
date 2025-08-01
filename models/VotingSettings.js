const mongoose = require('mongoose');

const votingSettingsSchema = new mongoose.Schema({
  votingDeadline: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Default: 7 days from now
  },
  isVotingActive: {
    type: Boolean,
    default: true
  },
  allowVoting: {
    type: Boolean,
    default: true
  },
  votingTitle: {
    type: String,
    default: 'Student Council Election'
  },
  votingDescription: {
    type: String,
    default: 'Vote for your preferred candidates'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Virtual to check if voting is currently allowed
votingSettingsSchema.virtual('canVote').get(function() {
  const now = new Date();
  return this.allowVoting && this.isVotingActive && now <= this.votingDeadline;
});

// Virtual to get time remaining in milliseconds
votingSettingsSchema.virtual('timeRemaining').get(function() {
  const now = new Date();
  const deadline = new Date(this.votingDeadline);
  return Math.max(0, deadline.getTime() - now.getTime());
});

// Virtual to check if voting has ended
votingSettingsSchema.virtual('hasEnded').get(function() {
  const now = new Date();
  return now > this.votingDeadline;
});

// Ensure virtuals are serialized
votingSettingsSchema.set('toJSON', { virtuals: true });
votingSettingsSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('VotingSettings', votingSettingsSchema); 