import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  createDocument,
  getDocuments,
  getDocumentById,
  updateDocument,
} from '../controllers/document.controller.js';

const router = Router();

router.use(requireAuth);

router.post('/', createDocument);
router.get('/', getDocuments);
router.get('/:id', getDocumentById);
router.put('/:id', updateDocument);

export default router;
