import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/index.js';
import { setupSocketHandlers } from './realtime/socket.handler.js';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import { errorHandler } from './middleware/error.middleware.js';
import { ApiResponse } from './utils/ApiResponse.js';

const app = express();
const server = http.createServer(app);

// --- Middleware ---
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: config.CORS_ORIGIN, credentials: true }));
app.use(morgan(config.NODE_ENV === 'development' ? 'dev' : 'combined'));
app.use(express.json());

// --- Health Check ---
app.get('/health', (req, res) => {
  res.status(200).json(ApiResponse.success({ uptime: process.uptime() }, "Server is healthy"));
});

// --- API Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// --- Socket.IO Setup ---
const io = new Server(server, {
  cors: {
    origin: config.CORS_ORIGIN,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
});

setupSocketHandlers(io);

// --- Global Error Handler ---
app.use(errorHandler);

// --- Server Lifecycle Management ---
const startServer = (port: number) => {
  const runner = server.listen(port, '0.0.0.0', () => {
    console.log(`
🚀 SERVER STARTED SUCCESSFULLY
🌍 Mode: ${config.NODE_ENV}
📍 Port: ${port}
🔗 Health: http://localhost:${port}/health
    `);
  });

  runner.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`❌ Port ${port} is already in use. Please kill the process or use a different port.`);
      process.exit(1);
    } else {
      console.error('❌ Server Error:', err);
    }
  });
};

startServer(config.PORT);

// --- Graceful Shutdown ---
const gracefulShutdown = () => {
  console.log('🛑 Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed.');
    process.exit(0);
  });

  // Force shutdown after 10s
  setTimeout(() => {
    console.error('⚠️ Could not close connections in time, forcefully shutting down.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
