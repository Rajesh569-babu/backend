const express = require('express');
const Candidate = require('../models/Candidate');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const candidates = await Candidate.find().sort({ votes: -1 });
    
    // Calculate total votes
    const totalVotes = candidates.reduce((sum, candidate) => sum + (candidate.votes || 0), 0);
    
    // Add percentage to each candidate
    const results = candidates.map(candidate => ({
      ...candidate.toObject(),
      percentage: totalVotes > 0 ? Math.round(((candidate.votes || 0) / totalVotes) * 100) : 0
    }));
    
    res.json({ 
      success: true,
      results,
      totalVotes
    });
  } catch (error) {
    console.error('Error fetching results:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching results',
      results: []
    });
  }
});

module.exports = router; 