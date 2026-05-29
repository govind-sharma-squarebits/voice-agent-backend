import { SocketRateLimiter } from '../middleware/rate.limit.middleware.js';
import { socketLogger } from '../utils/logger.js';
export const setupSocketHandlers = (io, orchestrator) => {
    const rateLimiter = new SocketRateLimiter();
    io.on('connection', (socket) => {
        const sessionId = socket.id;
        socketLogger.info({ socketId: socket.id }, 'Client connected');
        // ── Inbound Event Routing (thin — no business logic here) ─────
        socket.on('session:init', () => {
            socketLogger.debug({ sessionId }, 'session:init received');
            orchestrator.handleSessionInit(sessionId, socket).catch(err => {
                socketLogger.error({ sessionId, error: String(err) }, 'session:init error');
            });
        });
        socket.on('chat:message', (payload) => {
            if (!payload?.content?.trim())
                return;
            if (!rateLimiter.isAllowed(sessionId)) {
                socketLogger.warn({ sessionId }, 'Socket rate limit exceeded');
                socket.emit('error', { code: 'RATE_LIMITED', message: 'Too many messages. Please slow down.' });
                return;
            }
            rateLimiter.increment(sessionId);
            socketLogger.debug({ sessionId, contentLength: payload.content.length }, 'chat:message received');
            orchestrator.handleTextMessage(sessionId, payload.content, socket).catch(err => {
                socketLogger.error({ sessionId, error: String(err) }, 'chat:message error');
            });
        });
        socket.on('audio:chunk', (chunk) => {
            socketLogger.debug({ sessionId, bytes: chunk?.length ?? 0 }, 'audio:chunk received');
            orchestrator.handleAudioChunk(sessionId, chunk, socket).catch(err => {
                socketLogger.error({ sessionId, error: String(err) }, 'audio:chunk error');
            });
        });
        socket.on('audio:turn:end', () => {
            socketLogger.debug({ sessionId }, 'audio:turn:end received');
            orchestrator.handleAudioTurnEnd(sessionId, socket).catch(err => {
                socketLogger.error({ sessionId, error: String(err) }, 'audio:turn:end error');
            });
        });
        socket.on('audio:interrupted', () => {
            socketLogger.debug({ sessionId }, 'audio:interrupted received (barge-in)');
            orchestrator.cancelActiveTTS(sessionId);
        });
        socket.on('lead:step', (payload) => {
            if (!payload?.value?.trim())
                return;
            socketLogger.debug({ sessionId }, 'lead:step received');
            orchestrator.handleLeadStep(sessionId, payload.value, socket).catch(err => {
                socketLogger.error({ sessionId, error: String(err) }, 'lead:step error');
            });
        });
        socket.on('session:close', () => {
            socketLogger.debug({ sessionId }, 'session:close received');
            orchestrator.handleSessionClose(sessionId).catch(() => { });
        });
        socket.on('disconnect', (reason) => {
            rateLimiter.cleanup(sessionId);
            orchestrator.handleSessionClose(sessionId).catch(() => { });
            socketLogger.info({ socketId: socket.id, reason }, 'Client disconnected');
        });
    });
};
