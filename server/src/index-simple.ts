import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:5173",
  credentials: true
}));

// Logging
app.use(morgan('combined'));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'CampusBuddy API is running!',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Simple auth routes
app.post('/api/auth/register', (req, res) => {
  const { name, email, password, batch } = req.body;

  if (!name || !email || !password || !batch) {
    res.status(400).json({
      success: false,
      error: 'All fields are required'
    });
    return;
  }

  // Mock user creation
  const user = {
    id: `user_${Date.now()}`,
    name,
    email,
    batch,
    role: 'student',
    joinedAt: Date.now(),
    badges: [],
    points: 0,
  };

  const token = 'mock-jwt-token';

  res.status(201).json({
    success: true,
    data: { user, token }
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({
      success: false,
      error: 'Email and password are required'
    });
    return;
  }

  // Mock user login
  const user = {
    id: `user_${Date.now()}`,
    name: 'Test User',
    email,
    batch: '22L-6619',
    role: 'student',
    joinedAt: Date.now(),
    badges: [],
    points: 100,
  };

  const token = 'mock-jwt-token';

  res.json({
    success: true,
    data: { user, token }
  });
});

app.get('/api/auth/me', (req, res) => {
  // Mock current user
  const user = {
    id: 'current-user',
    name: 'Current User',
    email: 'user@example.com',
    batch: '22L-6619',
    role: 'student',
    joinedAt: Date.now(),
    badges: [],
    points: 150,
  };

  res.json({
    success: true,
    data: user
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Client URL: ${process.env.CORS_ORIGIN || "http://localhost:5173"}`);
});

export default app;
