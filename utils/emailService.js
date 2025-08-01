const nodemailer = require('nodemailer');

// Create transporter with better error handling
const createTransporter = () => {
  const emailUser = process.env.EMAIL_USER;
  const emailPassword = process.env.EMAIL_PASSWORD;
  
  console.log('🔧 Email configuration check:');
  console.log('  - EMAIL_USER:', emailUser ? 'Set' : 'Not set');
  console.log('  - EMAIL_PASSWORD:', emailPassword ? 'Set' : 'Not set');
  
  // Check if email credentials are properly configured
  if (!emailUser || !emailPassword || emailUser === 'your-email@gmail.com' || emailPassword === 'your-app-password') {
    console.warn('⚠️ Email credentials not properly configured. Using development fallback.');
    return null;
  }

  try {
    return nodemailer.createTransporter({
      service: 'gmail', // or 'outlook', 'yahoo', etc.
      auth: {
        user: emailUser,
        pass: emailPassword
      }
    });
  } catch (error) {
    console.error('Error creating email transporter:', error);
    return null;
  }
};

// Send password reset email
const sendPasswordResetEmail = async (email, resetToken, userName) => {
  try {
    const transporter = createTransporter();
    
    if (!transporter) {
      console.log('📧 Development mode: Password reset link would be sent to:', email);
      console.log('🔗 Reset URL:', `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}&email=${email}`);
      console.log('📝 In production, configure EMAIL_USER and EMAIL_PASSWORD in config.env');
      return true; // Return true in development mode
    }
    
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}&email=${email}`;
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Password Reset Request - Online Voting System',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 28px;">🗳️ Online Voting System</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Password Reset Request</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 10px; margin-top: 20px;">
            <h2 style="color: #333; margin-bottom: 20px;">Hello ${userName || 'User'}!</h2>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              We received a request to reset your password for your Online Voting System account. 
              If you didn't make this request, you can safely ignore this email.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="background: linear-gradient(45deg, #667eea, #764ba2); 
                        color: white; 
                        padding: 15px 30px; 
                        text-decoration: none; 
                        border-radius: 25px; 
                        font-weight: bold; 
                        display: inline-block;
                        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);">
                Reset Your Password
              </a>
            </div>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              <strong>Important:</strong> This link will expire in 15 minutes for security reasons.
            </p>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              If the button above doesn't work, you can copy and paste this link into your browser:
            </p>
            
            <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 0; word-break: break-all; color: #667eea; font-family: monospace; font-size: 12px;">
                ${resetUrl}
              </p>
            </div>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            
            <p style="color: #999; font-size: 14px; text-align: center; margin: 0;">
              This is an automated email. Please do not reply to this message.
            </p>
          </div>
        </div>
      `
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Password reset email sent successfully:', info.messageId);
    return true;
  } catch (error) {
    console.error('❌ Error sending password reset email:', error);
    
    // Log specific error details for debugging
    if (error.code === 'EAUTH') {
      console.error('🔐 Authentication failed. Check your email credentials.');
    } else if (error.code === 'ECONNECTION') {
      console.error('🌐 Connection failed. Check your internet connection.');
    } else if (error.code === 'ETIMEDOUT') {
      console.error('⏰ Connection timed out. Try again later.');
    }
    
    return false;
  }
};

// Send password reset success email
const sendPasswordResetSuccessEmail = async (email, userName) => {
  try {
    const transporter = createTransporter();
    
    if (!transporter) {
      console.log('📧 Development mode: Password reset success notification would be sent to:', email);
      return true; // Return true in development mode
    }
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Password Reset Successful - Online Voting System',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4;">
          <div style="background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); padding: 30px; border-radius: 10px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 28px;">✅ Password Reset Successful</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Online Voting System</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 10px; margin-top: 20px;">
            <h2 style="color: #333; margin-bottom: 20px;">Hello ${userName || 'User'}!</h2>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              Your password has been successfully reset. You can now log in to your account with your new password.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" 
                 style="background: linear-gradient(45deg, #4CAF50, #45a049); 
                        color: white; 
                        padding: 15px 30px; 
                        text-decoration: none; 
                        border-radius: 25px; 
                        font-weight: bold; 
                        display: inline-block;
                        box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3);">
                Login to Your Account
              </a>
            </div>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              <strong>Security Note:</strong> If you didn't request this password reset, please contact our support team immediately.
            </p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            
            <p style="color: #999; font-size: 14px; text-align: center; margin: 0;">
              This is an automated email. Please do not reply to this message.
            </p>
          </div>
        </div>
      `
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Password reset success email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('❌ Error sending password reset success email:', error);
    return false;
  }
};

module.exports = {
  sendPasswordResetEmail,
  sendPasswordResetSuccessEmail
}; 