const express = require('express');
const { body, validationResult } = require('express-validator');
const Election = require('../models/Election');
const Vote = require('../models/Vote');
const { protect, restrictTo, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/elections
// @desc    Get all elections (public)
// @access  Public
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { status, type, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    let query = { isPublic: true };

    if (status) {
      query.status = status;
    }

    if (type) {
      query.type = type;
    }

    const elections = await Election.find(query)
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Election.countDocuments(query);

    res.json({
      success: true,
      data: {
        elections,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalElections: total,
          hasNextPage: skip + elections.length < total,
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Get elections error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/elections/:id
// @desc    Get single election
// @access  Public
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const election = await Election.findById(req.params.id)
      .populate('createdBy', 'firstName lastName');

    if (!election) {
      return res.status(404).json({
        success: false,
        message: 'Election not found'
      });
    }

    // Check if user has voted (if authenticated)
    let hasVoted = false;
    if (req.user) {
      hasVoted = await Vote.hasVoted(req.user._id, req.params.id);
    }

    res.json({
      success: true,
      data: {
        election,
        hasVoted
      }
    });
  } catch (error) {
    console.error('Get election error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/elections
// @desc    Create new election
// @access  Private (Admin only)
router.post('/', protect, restrictTo('admin'), [
  body('title').trim().isLength({ min: 5, max: 100 }).withMessage('Title must be between 5 and 100 characters'),
  body('description').trim().isLength({ min: 10 }).withMessage('Description must be at least 10 characters'),
  body('type').isIn(['presidential', 'parliamentary', 'local', 'referendum', 'poll']).withMessage('Invalid election type'),
  body('startDate').isISO8601().withMessage('Invalid start date'),
  body('endDate').isISO8601().withMessage('Invalid end date'),
  body('candidates').isArray({ min: 2 }).withMessage('At least 2 candidates are required'),
  body('candidates.*.name').trim().notEmpty().withMessage('Candidate name is required'),
  body('candidates.*.party').optional().trim(),
  body('candidates.*.description').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const {
      title,
      description,
      type,
      startDate,
      endDate,
      candidates,
      votingMethod,
      requirements,
      settings,
      location,
      tags
    } = req.body;

    // Check if end date is after start date
    if (new Date(endDate) <= new Date(startDate)) {
      return res.status(400).json({
        success: false,
        message: 'End date must be after start date'
      });
    }

    const election = new Election({
      title,
      description,
      type,
      startDate,
      endDate,
      candidates,
      votingMethod,
      requirements,
      settings,
      location,
      tags,
      createdBy: req.user._id
    });

    await election.save();

    res.status(201).json({
      success: true,
      message: 'Election created successfully',
      data: { election }
    });
  } catch (error) {
    console.error('Create election error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during election creation'
    });
  }
});

// @route   PUT /api/elections/:id
// @desc    Update election
// @access  Private (Admin only)
router.put('/:id', protect, restrictTo('admin'), [
  body('title').optional().trim().isLength({ min: 5, max: 100 }),
  body('description').optional().trim().isLength({ min: 10 }),
  body('startDate').optional().isISO8601(),
  body('endDate').optional().isISO8601()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const election = await Election.findById(req.params.id);

    if (!election) {
      return res.status(404).json({
        success: false,
        message: 'Election not found'
      });
    }

    // Check if election has started
    if (election.status === 'active' || election.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update election that has already started or completed'
      });
    }

    const updatedElection = await Election.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Election updated successfully',
      data: { election: updatedElection }
    });
  } catch (error) {
    console.error('Update election error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during election update'
    });
  }
});

// @route   DELETE /api/elections/:id
// @desc    Delete election
// @access  Private (Admin only)
router.delete('/:id', protect, restrictTo('admin'), async (req, res) => {
  try {
    const election = await Election.findById(req.params.id);

    if (!election) {
      return res.status(404).json({
        success: false,
        message: 'Election not found'
      });
    }

    // Check if election has votes
    const voteCount = await Vote.countDocuments({ election: req.params.id });
    if (voteCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete election that has votes'
      });
    }

    await Election.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Election deleted successfully'
    });
  } catch (error) {
    console.error('Delete election error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during election deletion'
    });
  }
});

// @route   POST /api/elections/:id/start
// @desc    Start election
// @access  Private (Admin only)
router.post('/:id/start', protect, restrictTo('admin'), async (req, res) => {
  try {
    const election = await Election.findById(req.params.id);

    if (!election) {
      return res.status(404).json({
        success: false,
        message: 'Election not found'
      });
    }

    if (election.status !== 'upcoming') {
      return res.status(400).json({
        success: false,
        message: 'Election can only be started if it is in upcoming status'
      });
    }

    await election.startElection();

    res.json({
      success: true,
      message: 'Election started successfully',
      data: { election }
    });
  } catch (error) {
    console.error('Start election error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during election start'
    });
  }
});

// @route   POST /api/elections/:id/end
// @desc    End election
// @access  Private (Admin only)
router.post('/:id/end', protect, restrictTo('admin'), async (req, res) => {
  try {
    const election = await Election.findById(req.params.id);

    if (!election) {
      return res.status(404).json({
        success: false,
        message: 'Election not found'
      });
    }

    if (election.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Election can only be ended if it is active'
      });
    }

    await election.endElection();

    res.json({
      success: true,
      message: 'Election ended successfully',
      data: { election }
    });
  } catch (error) {
    console.error('End election error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during election end'
    });
  }
});

// @route   GET /api/elections/:id/results
// @desc    Get election results
// @access  Public
router.get('/:id/results', async (req, res) => {
  try {
    const election = await Election.findById(req.params.id);

    if (!election) {
      return res.status(404).json({
        success: false,
        message: 'Election not found'
      });
    }

    // Check if results should be shown
    if (!election.settings.showResults && election.status !== 'completed') {
      return res.status(403).json({
        success: false,
        message: 'Results are not available yet'
      });
    }

    const winners = election.getWinners();
    const participation = await Vote.getVoterParticipation(req.params.id);

    res.json({
      success: true,
      data: {
        election,
        winners,
        participation,
        candidates: election.candidates
      }
    });
  } catch (error) {
    console.error('Get results error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/elections/active/upcoming
// @desc    Get active and upcoming elections
// @access  Public
router.get('/active/upcoming', async (req, res) => {
  try {
    const now = new Date();
    
    const activeElections = await Election.find({
      status: 'active',
      startDate: { $lte: now },
      endDate: { $gte: now },
      isPublic: true
    }).populate('createdBy', 'firstName lastName');

    const upcomingElections = await Election.find({
      status: 'upcoming',
      startDate: { $gt: now },
      isPublic: true
    }).populate('createdBy', 'firstName lastName')
    .sort({ startDate: 1 })
    .limit(5);

    res.json({
      success: true,
      data: {
        activeElections,
        upcomingElections
      }
    });
  } catch (error) {
    console.error('Get active/upcoming elections error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router; 