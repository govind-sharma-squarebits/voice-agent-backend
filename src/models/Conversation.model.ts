import mongoose, { Document, Schema } from 'mongoose';
import { AgentMode, MessageRole } from '../types/index.js';

export interface IMessage {
  role: MessageRole;
  content: string;
  timestamp: Date;
}

export interface IConversation {
  _id?: any;
  sessionId: string;
  messages: IMessage[];
  mode: AgentMode;
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    role:      { type: String, enum: Object.values(MessageRole), required: true },
    content:   { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false },
);

const conversationSchema = new Schema<IConversation>(
  {
    sessionId: { type: String, required: true, unique: true, index: true },
    messages:  { type: [messageSchema], default: [] },
    mode:      {
      type: String,
      enum: Object.values(AgentMode),
      default: AgentMode.IDLE,
    },
  },
  { timestamps: true },
);

export const Conversation = mongoose.model<IConversation>('Conversation', conversationSchema);
