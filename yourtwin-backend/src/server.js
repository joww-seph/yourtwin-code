import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import connectDB from './config/database.js';
import { errorHandler } from './middleware/errorHandler.js';
import { initializeSocket } from './utils/socket.js';
import labSessionRoutes from './routes/labSessionRoutes.js';

// Import routes
import authRoutes from './routes/authRoutes.js';
import activityRoutes from './routes/activityRoutes.js';
import submissionRoutes from './routes/submissionRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import plagiarismRoutes from './routes/plagiarismRoutes.js';

// Import AI service for initialization
import * as aiService from './services/aiService.js';

// Load environment variables
dotenv.config();

// Validate required environment variables
const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET', 'JUDGE0_API_URL'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnvVars.join(', '));
  console.error('Please check your .env file and ensure all required variables are set.');
  process.exit(1);
}

// Initialize Express app
const app = express();
const httpServer = createServer(app);

// Initialize Socket.io with flexible CORS for local network
const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      // Allow all origins in development for local network access
      callback(null, true);
    },
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Connect to MongoDB
connectDB();

// Middleware - Allow CORS from multiple origins for local network access
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'http://localhost:3000',
  /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}:3000$/, // Local network IPs
  /^http:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}:3000$/, // 10.x.x.x network
  /^http:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3}:3000$/, // 172.16-31.x.x network
  // Tunnel URLs (localtunnel, ngrok, cloudflare)
  /^https:\/\/.*\.loca\.lt$/, // localtunnel
  /^https:\/\/.*\.ngrok.*\.app$/, // ngrok
  /^https:\/\/.*\.trycloudflare\.com$/ // cloudflare
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);

    // Check if origin matches any allowed pattern
    const isAllowed = allowedOrigins.some(allowed => {
      if (allowed instanceof RegExp) {
        return allowed.test(origin);
      }
      return allowed === origin;
    });

    if (isAllowed) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(null, true); // Allow anyway for development
    }
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware (development only)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// Health check route
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'YOURTWIN: CODE Backend is running!',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/lab-sessions', labSessionRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/plagiarism', plagiarismRoutes);

// Initialize Socket.io with connection handling
initializeSocket(io);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handler middleware (must be last)
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0'; // Listen on all network interfaces

httpServer.listen(PORT, HOST, async () => {
  console.log('🚀 ================================');
  console.log(`🚀 YOURTWIN: CODE Backend`);
  console.log(`🚀 Server running on http://${HOST}:${PORT}`);
  console.log(`🚀 Local network access enabled`);
  console.log(`🚀 Environment: ${process.env.NODE_ENV}`);
  console.log('🚀 ================================');

  // Initialize AI service (check providers and warm up)
  try {
    await aiService.initialize();
  } catch (error) {
    console.error('⚠️ AI Service initialization warning:', error.message);
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err);
  httpServer.close(() => process.exit(1));
});