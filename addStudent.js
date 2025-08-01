const mongoose = require('mongoose');
const dotenv = require('dotenv');
const readline = require('readline');
const User = require('./models/User');

dotenv.config({ path: './config.env' });

const MONGODB_URI = process.env.MONGODB_URI;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function addStudent() {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    rl.question('Enter student name: ', (name) => {
      rl.question('Enter student email: ', (email) => {
        rl.question('Enter student password: ', async (password) => {
          try {
            const existingUser = await User.findOne({ email });
            if (existingUser) {
              console.log('A user with this email already exists.');
              process.exit(1);
            }
            const student = new User({
              name,
              email,
              password,
              role: 'student',
              isActive: true,
              isVerified: true
            });
            await student.save();
            console.log('Student added successfully:', { name, email });
            process.exit(0);
          } catch (err) {
            console.error('Error adding student:', err);
            process.exit(1);
          }
        });
      });
    });
  } catch (err) {
    console.error('Error connecting to database:', err);
    process.exit(1);
  }
}

addStudent(); 