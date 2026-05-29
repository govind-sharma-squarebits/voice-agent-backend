import { Conversation, IConversation } from '../models/Conversation.model.js';
import { AgentMode, MessageDto } from '../types/index.js';
import { dbLogger } from '../utils/logger.js';

export class ConversationRepository {
  async upsertSession(sessionId: string, mode: AgentMode = AgentMode.IDLE): Promise<IConversation> {
    const doc = await Conversation.findOneAndUpdate(
      { sessionId },
      { $setOnInsert: { sessionId, mode, messages: [] } },
      { upsert: true, new: true },
    );
    return doc!;
  }

  async appendMessage(sessionId: string, message: MessageDto): Promise<void> {
    await Conversation.updateOne(
      { sessionId },
      {
        $push: { messages: message },
        $set: { updatedAt: new Date() },
      },
      { upsert: true },
    );
  }

  async appendMessages(sessionId: string, messages: MessageDto[]): Promise<void> {
    if (messages.length === 0) return;
    await Conversation.updateOne(
      { sessionId },
      {
        $push: { messages: { $each: messages } },
        $set: { updatedAt: new Date() },
      },
      { upsert: true },
    );
    dbLogger.debug({ sessionId, count: messages.length }, 'Persisted messages to DB');
  }

  async updateMode(sessionId: string, mode: AgentMode): Promise<void> {
    await Conversation.updateOne({ sessionId }, { $set: { mode } });
  }

  async getBySessionId(sessionId: string): Promise<IConversation | null> {
    return Conversation.findOne({ sessionId }).lean();
  }

  async getRecent(limit = 20): Promise<IConversation[]> {
    return Conversation.find()
      .sort({ updatedAt: -1 })
      .limit(limit)
      .lean() as Promise<IConversation[]>;
  }
}
