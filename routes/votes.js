const express = require('express');
const Candidate = require('../models/Candidate');
const router = express.Router();
const User = require('../models/User');
const VotingSettings = require('../models/VotingSettings');
const { protect, restrictTo } = require('../middleware/auth');

router.get('/', async (req, res) => {
  const candidates = await Candidate.find().sort({ votes: -1 });
  res.json({ candidates });
});

// @route   POST /api/vote
// @desc    Cast a vote for a candidate (student only)
// @access  Private (student)
router.post('/', protect, restrictTo('student'), async (req, res) => {
  try {
    const { candidateId } = req.body;
    const userId = req.user._id;

    // Check voting deadline and status
    const votingSettings = await VotingSettings.findOne().sort({ createdAt: -1 });
    if (votingSettings) {
      const now = new Date();
      const deadline = new Date(votingSettings.votingDeadline);
      
      if (!votingSettings.allowVoting || !votingSettings.isVotingActive) {
        return res.status(400).json({ 
          message: 'Voting is currently disabled' 
        });
      }
      
      if (now > deadline) {
        return res.status(400).json({ 
          message: 'Voting deadline has passed' 
        });
      }
    }

    // Check if user has already voted
    const user = await User.findById(userId);
    if (!user || user.hasVoted) {
      return res.status(400).json({ message: 'You have already voted or user not found' });
    }

    // Find candidate
    const candidate = await Candidate.findById(candidateId);
    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found' });
    }

    // Increment candidate's vote count
    candidate.votes = (candidate.votes || 0) + 1;
    await candidate.save();

    // Update user hasVoted
    user.hasVoted = true;
    await user.save();

    // Optionally, record the vote in Vote collection (if needed)
    // await Vote.create({ user: userId, candidate: candidateId });

    res.json({ message: 'Vote cast successfully' });
  } catch (error) {
    console.error('Vote error:', error);
    res.status(500).json({ message: 'Server error during voting' });
  }
});

module.exports = router; 