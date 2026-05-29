import { LeadRepository } from '../repositories/lead.repository.js';
import { ConversationRepository } from '../repositories/conversation.repository.js';
import { ApiResponse } from '../utils/ApiResponse.js';
const leadRepo = new LeadRepository();
const conversationRepo = new ConversationRepository();
export const adminController = {
    async listLeads(req, res) {
        const page = Math.max(1, Number(req.query['page']) || 1);
        const limit = Math.min(100, Number(req.query['limit']) || 20);
        const status = req.query['status'];
        const { leads, total } = await leadRepo.findAll(page, limit, status);
        res.json(ApiResponse.paginated(leads, total, page, limit));
    },
    async getLead(req, res) {
        const lead = await leadRepo.findById(req.params['id']);
        if (!lead) {
            res.status(404).json(ApiResponse.error('Lead not found', 404, 'NOT_FOUND'));
            return;
        }
        res.json(ApiResponse.success(lead));
    },
    async getConversation(req, res) {
        const convo = await conversationRepo.getBySessionId(req.params['sessionId']);
        if (!convo) {
            res.status(404).json(ApiResponse.error('Conversation not found', 404, 'NOT_FOUND'));
            return;
        }
        res.json(ApiResponse.success(convo));
    },
    async getAnalytics(_req, res) {
        const [serviceBreakdown, dailyStats, { leads: recentLeads, total }] = await Promise.all([
            leadRepo.getServiceBreakdown(),
            leadRepo.getDailyStats(30),
            leadRepo.findAll(1, 5),
        ]);
        res.json(ApiResponse.success({
            totalLeads: total,
            serviceBreakdown,
            dailyStats,
            recentLeads,
        }));
    },
};
