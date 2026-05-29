import mongoose, { Document, Schema, Types } from 'mongoose';
import { AgentMode } from '../types/index.js';

export interface ISession {
  sessionId: string;
  socketId: string;
  mode: AgentMode;
  leadId?: Types.ObjectId;
  startedAt: Date;
  endedAt?: Date;
}

const sessionSchema = new Schema<ISession>(
  {
    sessionId: { type: String, required: true, unique: true, index: true },
    socketId:  { type: String, required: true },
    mode:      {
      type: String,
      enum: Object.values(AgentMode),
      default: AgentMode.IDLE,
    },
    leadId:   { type: Schema.Types.ObjectId, ref: 'Lead' },
    startedAt: { type: Date, default: Date.now },
    endedAt:   { type: Date },
  },
  { timestamps: false },
);

export const Session = mongoose.model<ISession>('Session', sessionSchema);
