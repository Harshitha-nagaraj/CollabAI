/**
 * @file routes/knowledge.routes.ts
 *
 * Express Router for AI Decision Memory, Knowledge Base & Semantic Search.
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  getDecisions,
  createDecision,
  extractDecisions,
  semanticSearch,
  getKnowledgeTimeline,
  getContextAssistant,
} from '../controllers/knowledge.controller.js';

const router = Router();

router.use('/knowledge', requireAuth);

router.get('/knowledge/decisions', getDecisions);
router.post('/knowledge/decisions', createDecision);
router.post('/knowledge/extract-decisions', extractDecisions);
router.post('/knowledge/search', semanticSearch);
router.get('/knowledge/timeline', getKnowledgeTimeline);
router.get('/knowledge/context', getContextAssistant);

export default router;
