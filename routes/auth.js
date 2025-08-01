const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const PasswordReset = require('../models/PasswordReset');
const { sendPasswordResetEmail, sendPasswordResetSuccessEmail } = require('../utils/emailService');
const router = express.Router();

// Register
router.post('/register', [
  body('name').notEmpty(),
  body('email').isEmail(),
  body('password').isLength({ min: 6 }),
  body('role').isIn(['student', 'admin'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ 
      success: false,
      message: 'Validation failed',
      errors: errors.array() 
    });

    const { name, email, password, role } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ 
      success: false,
      message: 'Email already registered' 
    });

    const hashed = await bcrypt.hash(password, 12);
    const user = new User({ name, email, password: hashed, role, hasVoted: false });
    await user.save();
    
    // Generate token for the new user
    const token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
    
    res.status(201).json({ 
      success: true,
      message: 'Registration successful',
      token,
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        role: user.role, 
        hasVoted: user.hasVoted 
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error during registration' 
    });
  }
});

// Login
router.post('/login', [
  body('email').isEmail(),
  body('password').notEmpty()
], async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ 
      success: false,
      message: 'Invalid email or password' 
    });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ 
      success: false,
      message: 'Invalid email or password' 
    });

    const token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.json({ 
      success: true,
      message: 'Login successful',
      token, 
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        role: user.role, 
        hasVoted: user.hasVoted 
      } 
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error during login' 
    });
  }
});

// Get current user
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId || decoded.id;
    
    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
});

// Forgot Password - Request password reset
router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    const { email } = req.body;
    
    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if email exists or not for security
      return res.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.'
      });
    }

    // Create reset token
    const resetToken = await PasswordReset.createResetToken(email);
    console.log('🔑 Reset token created for:', email);
    
    // Send email
    console.log('📧 Attempting to send email to:', email);
    const emailSent = await sendPasswordResetEmail(email, resetToken.token, user.name);
    console.log('📧 Email send result:', emailSent);
    
    if (emailSent) {
      res.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent. Check your email or console for the reset link.'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send password reset email. Please check your email configuration or try again later.'
      });
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during password reset request'
    });
  }
});

// Reset Password - Verify token and reset password
router.post('/reset-password', [
  body('email').isEmail().normalizeEmail(),
  body('token').notEmpty(),
  body('password').isLength({ min: 6 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide valid information'
      });
    }

    const { email, token, password } = req.body;
    
    // Verify token
    const resetToken = await PasswordReset.verifyToken(email, token);
    if (!resetToken) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'User not found'
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Update user password
    user.password = hashedPassword;
    await user.save();
    
    // Mark token as used
    await resetToken.markAsUsed();
    
    // Send success email
    await sendPasswordResetSuccessEmail(email, user.name);
    
    res.json({
      success: true,
      message: 'Password has been reset successfully'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during password reset'
    });
  }
});

// Verify Reset Token
router.post('/verify-reset-token', [
  body('email').isEmail().normalizeEmail(),
  body('token').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide valid information'
      });
    }

    const { email, token } = req.body;
    
    // Verify token
    const resetToken = await PasswordReset.verifyToken(email, token);
    
    if (resetToken) {
      res.json({
        success: true,
        message: 'Token is valid'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }
  } catch (error) {
    console.error('Verify token error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during token verification'
    });
  }
});

module.exports = router; 