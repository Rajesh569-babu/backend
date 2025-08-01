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

async function addUser() {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    rl.question('Enter name: ', (name) => {
      rl.question('Enter email: ', (email) => {
        rl.question('Enter password: ', (password) => {
          rl.question('Enter role (admin/student): ', async (role) => {
            try {
              if (!['admin', 'student'].includes(role)) {
                console.log('Role must be either admin or student.');
                process.exit(1);
              }
              const existingUser = await User.findOne({ email });
              if (existingUser) {
                console.log('A user with this email already exists.');
                process.exit(1);
              }
              const user = new User({
                name,
                email,
                password,
                role,
                isActive: true,
                isVerified: true
              });
              await user.save();
              console.log('User added successfully:', { name, email, role });
              process.exit(0);
            } catch (err) {
              console.error('Error adding user:', err);
              process.exit(1);
            }
          });
        });
      });
    });
  } catch (err) {
    console.error('Error connecting to database:', err);
    process.exit(1);
  }
}

addUser(); 