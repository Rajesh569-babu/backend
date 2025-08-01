const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, enum: ['student', 'admin'] },
  hasVoted: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false },
  passwordChangedAt: Date,
  votedElections: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Election' }]
});
module.exports = mongoose.model('User', userSchema); 