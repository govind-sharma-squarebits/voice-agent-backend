import { Lead } from '../models/Lead.model.js';
import { dbLogger } from '../utils/logger.js';
export class LeadRepository {
    async create(dto) {
        const lead = new Lead(dto);
        await lead.save();
        dbLogger.info({ leadId: lead.id, sessionId: dto.sessionId, service: dto.service }, 'Lead created');
        return lead;
    }
    async findById(id) {
        return Lead.findById(id).lean();
    }
    async findBySessionId(sessionId) {
        return Lead.findOne({ sessionId }).lean();
    }
    async findAll(page = 1, limit = 20, status) {
        const filter = status ? { status } : {};
        const [leads, total] = await Promise.all([
            Lead.find(filter)
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            Lead.countDocuments(filter),
        ]);
        return { leads: leads, total };
    }
    async updateStatus(id, status) {
        return Lead.findByIdAndUpdate(id, { status }, { new: true }).lean();
    }
    async getServiceBreakdown() {
        return Lead.aggregate([
            { $group: { _id: '$service', count: { $sum: 1 } } },
            { $project: { service: '$_id', count: 1, _id: 0 } },
            { $sort: { count: -1 } },
        ]);
    }
    async getDailyStats(days = 30) {
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
