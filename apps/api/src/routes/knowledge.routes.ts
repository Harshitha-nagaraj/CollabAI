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

// Require authentication for all knowledge and search endpoints
router.use(requireAuth);

// Decisions
router.get('/decisions', getDecisions);
router.get('/knowledge/decisions', getDecisions);
router.post('/decisions', createDecision);
router.post('/knowledge/decisions', createDecision);

// Extract decisions from meeting
router.post('/extract-decisions', extractDecisions);
router.post('/knowledge/extract-decisions', extractDecisions);

// Semantic Search
router.post('/search', semanticSearch);
router.post('/knowledge/search', semanticSearch);

// Knowledge Timeline
router.get('/timeline', getKnowledgeTimeline);
router.get('/knowledge/timeline', getKnowledgeTimeline);

// Context Assistant
router.get('/context', getContextAssistant);
router.get('/knowledge/context', getContextAssistant);

export default router;
