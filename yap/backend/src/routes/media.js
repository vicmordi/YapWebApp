import { Router } from 'express';
import { z } from 'zod';
import { authRequired, requireCsrf } from '../middleware/auth.js';
import { containers, createGenericUploadSas } from '../services/azure.js';

const router = Router();

const schema = z.object({
  container: z.enum(['profiles', 'messages']),
  blobName: z.string().min(3),
  contentType: z.string().optional(),
  sizeBytes: z.number().positive().optional(),
  category: z.enum(['audio', 'image']).optional()
});

router.post('/sas', authRequired, requireCsrf, (req, res) => {
  try {
    const data = schema.parse(req.body);
    const containerName = containers[data.container];
    if (!containerName) {
      return res.status(400).json({ error: { code: 'INVALID_CONTAINER', message: 'Unknown container' } });
    }
    const sas = createGenericUploadSas({
      container: containerName,
      blobName: data.blobName,
      contentType: data.contentType,
      sizeBytes: data.sizeBytes,
      category: data.category
    });
    res.json(sas);
  } catch (err) {
    console.error('media sas error', err);
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: { code: 'INVALID_INPUT', message: err.errors.map((e) => e.message).join(', ') } });
    }
    const status = err.status || 500;
    res.status(status).json({ error: { code: err.code || 'MEDIA_SAS_FAILED', message: err.message } });
  }
});

export default router;
