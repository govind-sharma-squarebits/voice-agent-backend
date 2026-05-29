import { Router } from 'express';
import { adminController } from '../controllers/admin.controller.js';
const router = Router();
router.get('/leads', adminController.listLeads);
router.get('/leads/:id', adminController.getLead);
router.get('/conversations/:sessionId', adminController.getConversation);
router.get('/analytics', adminController.getAnalytics);
export default router;
