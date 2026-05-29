import { Lead, ILead } from '../models/Lead.model.js';
import { LeadDto, LeadStatus } from '../types/index.js';
import { dbLogger } from '../utils/logger.js';

export class LeadRepository {
  async create(dto: LeadDto): Promise<ILead> {
    const lead = new Lead(dto);
    await lead.save();
    dbLogger.info({ leadId: lead.id, sessionId: dto.sessionId, service: dto.service }, 'Lead created');
    return lead;
  }

  async findById(id: string): Promise<ILead | null> {
    return Lead.findById(id).lean();
  }

  async findBySessionId(sessionId: string): Promise<ILead | null> {
    return Lead.findOne({ sessionId }).lean();
  }

  async findAll(
    page = 1,
    limit = 20,
    status?: LeadStatus,
  ): Promise<{ leads: ILead[]; total: number }> {
    const filter = status ? { status } : {};
    const [leads, total] = await Promise.all([
      Lead.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Lead.countDocuments(filter),
    ]);
    return { leads: leads as ILead[], total };
  }

  async updateStatus(id: string, status: LeadStatus): Promise<ILead | null> {
    return Lead.findByIdAndUpdate(id, { status }, { new: true }).lean();
  }

  async getServiceBreakdown(): Promise<Array<{ service: string; count: number }>> {
    return Lead.aggregate([
      { $group: { _id: '$service', count: { $sum: 1 } } },
      { $project: { service: '$_id', count: 1, _id: 0 } },
      { $sort: { count: -1 } },
    ]);
  }

  async getDailyStats(days = 30): Promise<Array<{ date: string; count: number }>> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    return Lead.aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $project: { date: '$_id', count: 1, _id: 0 } },
      { $sort: { date: 1 } },
    ]);
  }
}
