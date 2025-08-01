const mongoose = require('mongoose');

const candidateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Candidate name is required'],
    trim: true
  },
  party: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  image: {
    type: String,
    default: ''
  },
  voteCount: {
    type: Number,
    default: 0
  }
});

const electionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Election title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Election description is required'],
    trim: true
  },
  type: {
    type: String,
    enum: ['presidential', 'parliamentary', 'local', 'referendum', 'poll'],
    required: [true, 'Election type is required']
  },
  status: {
    type: String,
    enum: ['draft', 'upcoming', 'active', 'completed', 'cancelled'],
    default: 'draft'
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required']
  },
  candidates: [candidateSchema],
  totalVotes: {
    type: Number,
    default: 0
  },
  eligibleVoters: {
    type: Number,
    default: 0
  },
  votingMethod: {
    type: String,
    enum: ['first-past-the-post', 'proportional', 'ranked-choice'],
    default: 'first-past-the-post'
  },
  requirements: {
    minimumAge: {
      type: Number,
      default: 18
    },
    citizenship: {
      type: Boolean,
      default: true
    },
    residency: {
      type: Boolean,
      default: false
    },
    registrationRequired: {
      type: Boolean,
      default: true
    }
  },
  settings: {
    allowMultipleVotes: {
      type: Boolean,
      default: false
    },
    requirePhotoId: {
      type: Boolean,
      default: false
    },
    anonymousVoting: {
      type: Boolean,
      default: true
    },
    showResults: {
      type: Boolean,
      default: true
    }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  location: {
    country: String,
    state: String,
    city: String,
    district: String
  },
  tags: [{
    type: String,
    trim: true
  }],
  isPublic: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for efficient queries
electionSchema.index({ status: 1, startDate: 1, endDate: 1 });
electionSchema.index({ type: 1, status: 1 });

// Virtual for checking if election is active
electionSchema.virtual('isActive').get(function() {
  const now = new Date();
  return this.status === 'active' && 
         now >= this.startDate && 
         now <= this.endDate;
});

// Virtual for checking if election is upcoming
electionSchema.virtual('isUpcoming').get(function() {
  const now = new Date();
  return this.status === 'upcoming' && now < this.startDate;
});

// Virtual for checking if election is completed
electionSchema.virtual('isCompleted').get(function() {
  const now = new Date();
  return this.status === 'completed' || now > this.endDate;
});

// Method to start election
electionSchema.methods.startElection = function() {
  this.status = 'active';
  return this.save();
};

// Method to end election
electionSchema.methods.endElection = function() {
  this.status = 'completed';
  return this.save();
};

// Method to add vote to candidate
electionSchema.methods.addVote = function(candidateId) {
  const candidate = this.candidates.id(candidateId);
  if (candidate) {
    candidate.voteCount += 1;
    this.totalVotes += 1;
    return this.save();
  }
  throw new Error('Candidate not found');
};

// Method to get winner(s)
electionSchema.methods.getWinners = function() {
  if (this.candidates.length === 0) return [];
  
  const maxVotes = Math.max(...this.candidates.map(c => c.voteCount));
  return this.candidates.filter(c => c.voteCount === maxVotes);
};

// Ensure virtuals are serialized
electionSchema.set('toJSON', { virtuals: true });
electionSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Election', electionSchema); 