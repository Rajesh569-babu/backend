const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes - require authentication
exports.protect = async (req, res, next) => {
  try {
    let token;

    // Check if token exists in headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Check if token exists
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'You are not logged in. Please log in to get access.'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Debug logging
    console.log('Token decoded:', decoded);

    // Check if user still exists - handle both id and userId for backward compatibility
    const userId = decoded.userId || decoded.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token structure. Please log in again.'
      });
    }
    
    const currentUser = await User.findById(userId);
    if (!currentUser) {
      return res.status(401).json({
        success: false,
        message: 'The user belonging to this token no longer exists.'
      });
    }

    // Check if user changed password after the token was issued
    if (currentUser.passwordChangedAt) {
      const changedTimestamp = parseInt(currentUser.passwordChangedAt.getTime() / 1000, 10);
      if (decoded.iat < changedTimestamp) {
        return res.status(401).json({
          success: false,
          message: 'User recently changed password! Please log in again.'
        });
      }
    }

    // Grant access to protected route
    req.user = currentUser;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid token. Please log in again.'
    });
  }
};

// Restrict to certain roles
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to perform this action'
      });
    }
    next();
  };
};

// Optional authentication - doesn't require token but adds user if available
exports.optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const currentUser = await User.findById(decoded.id);
      if (currentUser) {
        req.user = currentUser;
      }
    }

    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

// Generate JWT token
exports.generateToken = (id) => {
  return jwt.sign({ userId: id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '30d'
  });
};

// Check if user is eligible to vote in election
exports.checkVotingEligibility = async (req, res, next) => {
  try {
    const { electionId } = req.params;
    const userId = req.user._id;

    // Check if user has already voted
    const hasVoted = await req.user.votedElections.includes(electionId);
    if (hasVoted) {
      return res.status(400).json({
        success: false,
        message: 'You have already voted in this election'
      });
    }

    // Check if user is verified
    if (!req.user.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'Your account must be verified to vote'
      });
    }

    // Check if user is active
    if (!req.user.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Your account is not active'
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error checking voting eligibility'
    });
  }
}; 