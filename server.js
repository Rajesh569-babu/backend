const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const http = require('http');
const socketIo = require('socket.io');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

// Load environment variables
dotenv.config({ path: './config.env' });

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const candidateRoutes = require('./routes/candidates');
const voteRoutes = require('./routes/votes');
const resultRoutes = require('./routes/results');
const votingSettingsRoutes = require('./routes/votingSettings');

const app = express();
app.set('trust proxy', 1); // Enable trust proxy for Render and similar platforms
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:3001"],
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(helmet());
app.use(morgan('combined'));
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-domain.com'] 
    : ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000 // allow more requests in development
});
app.use('/api/', limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Database connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Ensure admin user exists on server start
async function ensureAdminUser() {
  const adminEmail = 'rajbabu143341@gmail.com';
  const adminPassword = 'thecaptainwar';
  const adminName = 'Admin';
  try {
    let admin = await User.findOne({ email: adminEmail });
    if (!admin) {
      const hashedPassword = await bcrypt.hash(adminPassword, 12);
      admin = new User({
        name: adminName,
        email: adminEmail,
        password: hashedPassword,
        role: 'admin',
        isActive: true,
        isVerified: true
      });
      await admin.save();
      console.log('Admin user created.');
    } else {
      // Optionally update password if you want to always reset it
      const hashedPassword = await bcrypt.hash(adminPassword, 12);
      admin.password = hashedPassword;
      admin.isActive = true;
      admin.isVerified = true;
      await admin.save();
      console.log('Admin user updated.');
    }
  } catch (err) {
    console.error('Error ensuring admin user:', err);
  }
}

mongoose.connection.once('open', ensureAdminUser);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/candidates', candidateRoutes);
app.use('/api/votes', voteRoutes);
app.use('/api/results', resultRoutes);
app.use('/api/voting-settings', votingSettingsRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

app.get('/', (req, res) => {
  res.json({ message: 'API server running' });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-election', (electionId) => {
    socket.join(`election-${electionId}`);
    console.log(`User ${socket.id} joined election ${electionId}`);
  });

  socket.on('cast-vote', (data) => {
    // Broadcast vote update to all users in the election
    socket.to(`election-${data.electionId}`).emit('vote-update', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false, 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Route not found' 
  });
});

const PORT = process.env.PORT || 5003;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});

module.exports = { app, io };