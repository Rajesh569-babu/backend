const express = require('express');
const router = express.Router();
const Candidate = require('../models/Candidate');
const { protect, restrictTo } = require('../middleware/auth');

// @route   POST api/candidates
// @desc    Add a new candidate
// @access  Private (Admin only)
router.post('/', protect, restrictTo('admin'), async (req, res) => {
    const { name, position, photoUrl } = req.body;

    try {
        // Validate required fields
        if (!name || !position) {
            return res.status(400).json({ 
                success: false, 
                message: 'Name and position are required' 
            });
        }

        const newCandidate = new Candidate({
            name,
            position,
            photoUrl: photoUrl || '' // This would typically be a URL from an image upload service
        });

        const candidate = await newCandidate.save();
        res.json({ 
            success: true, 
            data: candidate,
            message: 'Candidate added successfully'
        });
    } catch (err) {
        console.error('Error adding candidate:', err.message);
        res.status(500).json({ 
            success: false, 
            message: 'Server Error while adding candidate',
            error: process.env.NODE_ENV === 'development' ? err.message : {}
        });
    }
});

// @route   GET api/candidates
// @desc    Get all candidates
// @access  Public (or Private to logged-in users, decided here as public for simplicity)
router.get('/', async (req, res) => {
    try {
        const candidates = await Candidate.find().sort({ name: 1 }); // Sort by name
        res.json(candidates);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/candidates/:id
// @desc    Update a candidate
// @access  Private (Admin only)
router.put('/:id', protect, restrictTo('admin'), async (req, res) => {
    const { name, position, photoUrl } = req.body;

    // Build candidate object
    const candidateFields = {};
    if (name) candidateFields.name = name;
    if (position) candidateFields.position = position;
    if (photoUrl) candidateFields.photoUrl = photoUrl;

    try {
        let candidate = await Candidate.findById(req.params.id);

        if (!candidate) {
            return res.status(404).json({ msg: 'Candidate not found' });
        }

        candidate = await Candidate.findByIdAndUpdate(
            req.params.id,
            { $set: candidateFields },
            { new: true } // Return the updated document
        );

        res.json(candidate);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE api/candidates/:id
// @desc    Delete a candidate
// @access  Private (Admin only)
router.delete('/:id', protect, restrictTo('admin'), async (req, res) => {
    try {
        const candidate = await Candidate.findById(req.params.id);

        if (!candidate) {
            return res.status(404).json({ msg: 'Candidate not found' });
        }

        await Candidate.findByIdAndDelete(req.params.id);

        res.json({ msg: 'Candidate removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;