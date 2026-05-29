import mongoose, { Schema } from 'mongoose';
import { LeadStatus } from '../types/index.js';
const leadSchema = new Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
    company: { type: String, trim: true },
    service: { type: String, required: true },
    requirements: { type: String, required: true },
    sessionId: { type: String, required: true, index: true },
    status: {
        type: String,
        enum: Object.values(LeadStatus),
        default: LeadStatus.NEW,
    },
}, { timestamps: true });
leadSchema.index({ email: 1 });
leadSchema.index({ createdAt: -1 });
leadSchema.index({ status: 1 });
export const Lead = mongoose.model('Lead', leadSchema);
