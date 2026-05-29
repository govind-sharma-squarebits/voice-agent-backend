import mongoose from 'mongoose';
import { config } from '../config/index.js';
import { dbLogger } from '../utils/logger.js';

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 3000;

async function connectWithRetry(attempt = 1): Promise<void> {
  try {
    await mongoose.connect(config.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    dbLogger.info({ uri: config.MONGODB_URI.replace(/\/\/.*@/, '//***@') }, 'MongoDB connected');
  } catch (error) {
    const err = error instanceof Error ? error.message : String(error);
    dbLogger.warn({ attempt, error: err }, `MongoDB connection failed. Retrying in ${RETRY_DELAY_MS}ms...`);

    if (attempt >= MAX_RETRIES) {
      dbLogger.error({ attempts: MAX_RETRIES }, 'MongoDB connection exhausted. Exiting.');
      process.exit(1);
    }

    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * attempt));
    return connectWithRetry(attempt + 1);
  }
}

export async function connectDatabase(): Promise<void> {
  mongoose.set('strictQuery', true);

  mongoose.connection.on('disconnected', () => {
    dbLogger.warn('MongoDB disconnected');
  });

  mongoose.connection.on('reconnected', () => {
    dbLogger.info('MongoDB reconnected');
  });

  await connectWithRetry();
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.connection.close();
  dbLogger.info('MongoDB connection closed');
}
