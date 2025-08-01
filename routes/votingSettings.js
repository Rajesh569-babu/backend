const express = require('express');
const router = express.Router();
const VotingSettings = require('../models/VotingSettings');
const { protect, restrictTo } = require('../middleware/auth');

// @route   GET api/voting-settings
// @desc    Get current voting settings
// @access  Public
router.get('/', async (req, res) => {
    try {
        let settings = await VotingSettings.findOne().sort({ createdAt: -1 });
        
        if (!settings) {
            // Create default settings if none exist
            settings = new VotingSettings({
                createdBy: req.user?._id || '000000000000000000000000' // Default admin ID
            });
            await settings.save();
        }
        
        res.json(settings);
    } catch (err) {
        console.error('Error fetching voting settings:', err.message);
        res.status(500).json({ 
            success: false, 
            message: 'Server Error while fetching voting settings',
            error: process.env.NODE_ENV === 'development' ? err.message : {}
        });
    }
});

// @route   POST api/voting-settings
// @desc    Create or update voting settings
// @access  Private (Admin only)
router.post('/', protect, restrictTo('admin'), async (req, res) => {
    const { votingDeadline, isVotingActive, allowVoting, votingTitle, votingDescription } = req.body;

    try {
        // Validate required fields
        if (!votingDeadline) {
            return res.status(400).json({ 
                success: false, 
                message: 'Voting deadline is required' 
            });
        }

        // Check if deadline is in the future
        const deadline = new Date(votingDeadline);
        const now = new Date();
        
        if (deadline <= now) {
            return res.status(400).json({ 
                success: false, 
                message: 'Voting deadline must be in the future' 
            });
        }

        // Find existing settings or create new ones
        let settings = await VotingSettings.findOne().sort({ createdAt: -1 });
        
        if (settings) {
            // Update existing settings
            settings.votingDeadline = deadline;
            settings.isVotingActive = isVotingActive !== undefined ? isVotingActive : settings.isVotingActive;
            settings.allowVoting = allowVoting !== undefined ? allowVoting : settings.allowVoting;
            settings.votingTitle = votingTitle || settings.votingTitle;
            settings.votingDescription = votingDescription || settings.votingDescription;
            settings.createdBy = req.user._id;
        } else {
            // Create new settings
            settings = new VotingSettings({
                votingDeadline: deadline,
                isVotingActive: isVotingActive !== undefined ? isVotingActive : true,
                allowVoting: allowVoting !== undefined ? allowVoting : true,
                votingTitle: votingTitle || 'Student Council Election',
                votingDescription: votingDescription || 'Vote for your preferred candidates',
                createdBy: req.user._id
            });
        }

        await settings.save();

        res.json({ 
            success: true, 
            data: settings,
            message: 'Voting settings updated successfully'
        });
    } catch (err) {
        console.error('Error updating voting settings:', err.message);
        res.status(500).json({ 
            success: false, 
            message: 'Server Error while updating voting settings',
            error: process.env.NODE_ENV === 'development' ? err.message : {}
        });
    }
});

// @route   PUT api/voting-settings/toggle
// @desc    Toggle voting status
// @access  Private (Admin only)
router.put('/toggle', protect, restrictTo('admin'), async (req, res) => {
    try {
        let settings = await VotingSettings.findOne().sort({ createdAt: -1 });
        
        if (!settings) {
            return res.status(404).json({ 
                success: false, 
                message: 'No voting settings found' 
            });
        }

        settings.allowVoting = !settings.allowVoting;
        await settings.save();

        res.json({ 
            success: true, 
            data: settings,
            message: `Voting ${settings.allowVoting ? 'enabled' : 'disabled'} successfully`
        });
    } catch (err) {
        console.error('Error toggling voting status:', err.message);
        res.status(500).json({ 
            success: false, 
            message: 'Server Error while toggling voting status',
            error: process.env.NODE_ENV === 'development' ? err.message : {}
        });
    }
});

// @route   GET api/voting-settings/status
// @desc    Get voting status (for checking if voting is allowed)
// @access  Public
router.get('/status', async (req, res) => {
    try {
        let settings = await VotingSettings.findOne().sort({ createdAt: -1 });
        
        if (!settings) {
            return res.json({
                canVote: false,
                hasEnded: true,
                timeRemaining: 0,
                message: 'No voting session configured'
            });
        }

        const now = new Date();
        const deadline = new Date(settings.votingDeadline);
        const timeRemaining = Math.max(0, deadline.getTime() - now.getTime());
        const hasEnded = now > deadline;
        const canVote = settings.allowVoting && settings.isVotingActive && !hasEnded;

        res.json({
            canVote,
            hasEnded,
            timeRemaining,
            votingDeadline: settings.votingDeadline,
            votingTitle: settings.votingTitle,
            votingDescription: settings.votingDescription,
            message: canVote ? 'Voting is active' : hasEnded ? 'Voting has ended' : 'Voting is disabled'
        });
    } catch (err) {
        console.error('Error fetching voting status:', err.message);
        res.status(500).json({ 
            success: false, 
            message: 'Server Error while fetching voting status',
            error: process.env.NODE_ENV === 'development' ? err.message : {}
        });
    }
});

module.exports = router; 