const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');

// Load environment variables
dotenv.config({ path: './config.env' });

const MONGODB_URI = process.env.MONGODB_URI;

async function resetUsers() {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Delete all users
    await User.deleteMany({});
    console.log('All users deleted. No admin or student exists.');

    process.exit(0);
  } catch (err) {
    console.error('Error resetting users:', err);
    process.exit(1);
  }
}

resetUsers(); 