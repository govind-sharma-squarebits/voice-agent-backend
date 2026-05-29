import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { config } from './config/index.js';
import { connectDatabase, disconnectDatabase } from './database/connection.js';
import { loadKnowledgeBase } from './ai/knowledge.loader.js';
import { setupSocketHandlers } from './realtime/socket.handler.js';
import { errorHandler } from './middleware/error.middleware.js';
import { httpRateLimiter } from './middleware/rate.limit.middleware.js';
import { ApiResponse } from './utils/ApiResponse.js';
import { logger } from './utils/logger.js';

// Services & Orchestrator
import { AIService } from './services/ai.service.js';
import { VoiceService } from './services/voice.service.js';
import { ConversationOrchestrator } from './services/conversation.orchestrator.js';
import { ConversationMemoryManager } from './services/conversation.memory.manager.js';
import { LeadCollector } from './ai/lead.collector.js';
import { ConversationRepository } from './repositories/conversation.repository.js';
import { LeadRepository } from './repositories/lead.repository.js';

// Admin routes
import adminRoutes from './routes/admin.routes.js';

const app = express();
const server = http.createServer(app);

// ── Middleware ───────────────────────────────────────────────────

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: config.CORS_ORIGIN, credentials: true }));
app.use(morgan(config.NODE_ENV === 'development' ? 'dev' : 'combined'));
app.use(express.json());

// ── Health ───────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.status(200).json(ApiResponse.success({ uptime: process.uptime() }, 'Server is healthy'));
});

// ── Rate-Limited API Routes ──────────────────────────────────────

app.use('/api/', httpRateLimiter);
app.use('/api/admin', adminRoutes);

// ── Error Handler ────────────────────────────────────────────────

app.use(errorHandler);

// ── Socket.IO ────────────────────────────────────────────────────

const io = new Server(server, {
  cors: {
    origin: config.CORS_ORIGIN,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
});

// ── Bootstrap ────────────────────────────────────────────────────

async function bootstrap(): Promise<void> {
  // 1. Connect to MongoDB
  await connectDatabase();

  // 2. Load knowledge base into memory cache
  await loadKnowledgeBase();

  // 3. Wire up all services
  const aiService       = new AIService();
  const voiceService    = new VoiceService();
  const memoryManager   = new ConversationMemoryManager();
  const leadCollector   = new LeadCollector();
  const conversationRepo = new ConversationRepository();
  const leadRepo        = new LeadRepository();

  const orchestrator = new ConversationOrchestrator(
    aiService,
    voiceService,
    memoryManager,
    leadCollector,
    conversationRepo,
    leadRepo,
  );

  // 4. Wire socket handlers
  setupSocketHandlers(io, orchestrator);

  // 5. Start listening
  server.listen(config.PORT, '0.0.0.0', () => {
    logger.info({
      port: config.PORT,
      env: config.NODE_ENV,
    }, '🚀 Teqvira Voice Agent server started');
  });

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      logger.error({ port: config.PORT }, 'Port already in use');
      process.exit(1);
    }
    logger.error({ error: err.message }, 'Server error');
  });

  // ── Graceful Shutdown ──────────────────────────────────────────

  const gracefulShutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutting down gracefully...');
    orchestrator.shutdown();
    server.close(async () => {
      await disconnectDatabase();
      logger.info('Server and DB connections closed');
      process.exit(0);
    });

    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10_000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT',  () => gracefulShutdown('SIGINT'));
}

bootstrap().catch(err => {
  logger.error({ error: String(err) }, 'Bootstrap failed');
  process.exit(1);
});
