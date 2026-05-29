import rateLimit from 'express-rate-limit';
import { config } from '../config/index.js';
import { httpLogger } from '../utils/logger.js';

// ── HTTP Rate Limiter (per IP, for all /api/* routes) ─────────────

export const httpRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.RATE_LIMIT_HTTP_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    httpLogger.warn({ ip: req.ip, path: req.path }, 'HTTP rate limit exceeded');
    res.status(429).json({
      success: false,
      code: 'RATE_LIMITED',
      message: 'Too many requests. Please try again later.',
    });
  },
});

// ── Socket Rate Limiter (per session/socket) ──────────────────────

interface RateBucket {
  count: number;
  resetAt: number;
}

export class SocketRateLimiter {
  private readonly buckets: Map<string, RateBucket> = new Map();
  private readonly windowMs = 60 * 1000; // 1 minute window

  isAllowed(socketId: string): boolean {
    const now = Date.now();
    const bucket = this.buckets.get(socketId);

    if (!bucket || now > bucket.resetAt) {
      this.buckets.set(socketId, { count: 1, resetAt: now + this.windowMs });
      return true;
    }

    return bucket.count < config.RATE_LIMIT_SOCKET_MAX;
  }

  increment(socketId: string): void {
    const bucket = this.buckets.get(socketId);
    if (bucket) bucket.count++;
  }

  cleanup(socketId: string): void {
    this.buckets.delete(socketId);
  }
}
