import { sessionLogger } from '../utils/logger.js';
const CHARS_PER_TOKEN = 4; // rough approximation
export class ConversationMemoryManager {
    maxTokens;
    maxMessages;
    maxConcurrentSessions;
    constructor(maxTokens = 4000, maxMessages = 20, maxConcurrentSessions = 500) {
        this.maxTokens = maxTokens;
        this.maxMessages = maxMessages;
        this.maxConcurrentSessions = maxConcurrentSessions;
    }
    estimateTokens(text) {
        return Math.ceil(text.length / CHARS_PER_TOKEN);
    }
    totalTokens(messages) {
        return messages.reduce((sum, m) => sum + this.estimateTokens(m.content), 0);
    }
    /**
     * Trims history to stay within token and message budgets.
     * Always removes oldest messages first (sliding window).
     */
    trimHistory(history) {
        let trimmed = [...history];
        // Hard cap on message count
        if (trimmed.length > this.maxMessages) {
            const removed = trimmed.length - this.maxMessages;
            trimmed = trimmed.slice(removed);
            sessionLogger.debug({ removed, remaining: trimmed.length }, 'History trimmed by message count');
        }
        // Token budget enforcement
        while (trimmed.length > 2 && this.totalTokens(trimmed) > this.maxTokens) {
            trimmed.shift(); // remove oldest
        }
        return trimmed;
    }
    /**
     * Evicts sessions that have been idle longer than the threshold.
     * Caller is responsible for persisting to DB before calling this.
     */
    evictStaleSessions(sessions, inactiveThresholdMs, onEvict) {
        const now = Date.now();
        const toEvict = [];
        for (const [sessionId, session] of sessions) {
            const idleMs = now - session.lastActivityAt.getTime();
            if (idleMs > inactiveThresholdMs) {
                toEvict.push([sessionId, session]);
            }
        }
        for (const [sessionId, session] of toEvict) {
            sessions.delete(sessionId);
            // Fire-and-forget persist
            onEvict(sessionId, session).catch(err => {
                sessionLogger.error({ sessionId, error: String(err) }, 'Failed to persist evicted session');
            });
            sessionLogger.info({ sessionId }, 'Stale session evicted from memory');
        }
        if (toEvict.length > 0) {
            sessionLogger.info({ evicted: toEvict.length, remaining: sessions.size }, 'Eviction cycle complete');
        }
    }
    /**
     * Checks if the session map has exceeded the max concurrent limit.
     */
    isAtCapacity(sessions) {
        const atCap = sessions.size >= this.maxConcurrentSessions;
        if (atCap) {
            sessionLogger.warn({ sessions: sessions.size, max: this.maxConcurrentSessions }, 'Session capacity reached');
        }
        return atCap;
    }
}
