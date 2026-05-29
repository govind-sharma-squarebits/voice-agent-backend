import pino from 'pino';
import { config } from '../config/index.js';
const transport = config.NODE_ENV !== 'production'
    ? {
        target: 'pino-pretty',
        options: {
            colorize: true,
            translateTime: 'SYS:HH:MM:ss',
            ignore: 'pid,hostname',
        },
    }
    : undefined;
export const logger = pino({
    level: config.NODE_ENV === 'production' ? 'info' : 'debug',
    transport,
});
// Domain-specific child loggers
export const socketLogger = logger.child({ module: 'socket' });
export const aiLogger = logger.child({ module: 'ai' });
export const voiceLogger = logger.child({ module: 'voice' });
export const sessionLogger = logger.child({ module: 'session' });
export const dbLogger = logger.child({ module: 'database' });
export const httpLogger = logger.child({ module: 'http' });
