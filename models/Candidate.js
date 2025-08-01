const mongoose = require('mongoose');

const candidateSchema = new mongoose.Schema({
  name: String,
  position: String,
  photoUrl: String,
  votes: { type: Number, default: 0 }
});

module.exports = mongoose.model('Candidate', candidateSchema); 