import mongoose, { Schema } from 'mongoose';
import { AgentMode, MessageRole } from '../types/index.js';
const messageSchema = new Schema({
    role: { type: String, enum: Object.values(MessageRole), required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
}, { _id: false });
const conversationSchema = new Schema({
    sessionId: { type: String, required: true, unique: true, index: true },
    messages: { type: [messageSchema], default: [] },
    mode: {
        type: String,
        enum: Object.values(AgentMode),
        default: AgentMode.IDLE,
    },
}, { timestamps: true });
export const Conversation = mongoose.model('Conversation', conversationSchema);
