import mongoose, { Schema } from 'mongoose';
import { AgentMode } from '../types/index.js';
const sessionSchema = new Schema({
    sessionId: { type: String, required: true, unique: true, index: true },
    socketId: { type: String, required: true },
    mode: {
        type: String,
        enum: Object.values(AgentMode),
        default: AgentMode.IDLE,
    },
    leadId: { type: Schema.Types.ObjectId, ref: 'Lead' },
    startedAt: { type: Date, default: Date.now },
    endedAt: { type: Date },
}, { timestamps: false });
export const Session = mongoose.model('Session', sessionSchema);
