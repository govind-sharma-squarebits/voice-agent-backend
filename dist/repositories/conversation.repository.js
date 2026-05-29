import { Conversation } from '../models/Conversation.model.js';
import { AgentMode } from '../types/index.js';
import { dbLogger } from '../utils/logger.js';
export class ConversationRepository {
    async upsertSession(sessionId, mode = AgentMode.IDLE) {
        const doc = await Conversation.findOneAndUpdate({ sessionId }, { $setOnInsert: { sessionId, mode, messages: [] } }, { upsert: true, new: true });
        return doc;
    }
    async appendMessage(sessionId, message) {
        await Conversation.updateOne({ sessionId }, {
            $push: { messages: message },
            $set: { updatedAt: new Date() },
        }, { upsert: true });
    }
    async appendMessages(sessionId, messages) {
        if (messages.length === 0)
            return;
        await Conversation.updateOne({ sessionId }, {
            $push: { messages: { $each: messages } },
            $set: { updatedAt: new Date() },
        }, { upsert: true });
        dbLogger.debug({ sessionId, count: messages.length }, 'Persisted messages to DB');
    }
    async updateMode(sessionId, mode) {
        await Conversation.updateOne({ sessionId }, { $set: { mode } });
    }
    async getBySessionId(sessionId) {
        return Conversation.findOne({ sessionId }).lean();
    }
    async getRecent(limit = 20) {
        return Conversation.find()
            .sort({ updatedAt: -1 })
            .limit(limit)
            .lean();
    }
}
