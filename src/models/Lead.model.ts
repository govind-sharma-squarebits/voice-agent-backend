import mongoose, { Document, Schema } from 'mongoose';
import { LeadStatus } from '../types/index.js';

export interface ILead {
  _id?: any;
  name: string;
  email: string;
  phone: string;
  company?: string;
  service: string;
  requirements: string;
  sessionId: string;
  status: LeadStatus;
  createdAt: Date;
  updatedAt: Date;
}

const leadSchema = new Schema<ILead>(
  {
    name:         { type: String, required: true, trim: true },
    email:        { type: String, required: true, trim: true, lowercase: true },
    phone:        { type: String, required: true, trim: true },
    company:      { type: String, trim: true },
    service:      { type: String, required: true },
    requirements: { type: String, required: true },
    sessionId:    { type: String, required: true, index: true },
    status:       {
      type: String,
      enum: Object.values(LeadStatus),
      default: LeadStatus.NEW,
    },
  },
  { timestamps: true },
);

leadSchema.index({ email: 1 });
leadSchema.index({ createdAt: -1 });
leadSchema.index({ status: 1 });

export const Lead = mongoose.model<ILead>('Lead', leadSchema);
