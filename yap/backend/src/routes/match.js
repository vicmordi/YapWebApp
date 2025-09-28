import { Router } from 'express';
import { authRequired, requireCsrf } from '../middleware/auth.js';
import { findMatchForUser } from '../services/matchmaker.js';

const router = Router();

router.post('/find', authRequired, requireCsrf, async (req, res) => {
  try {
    const match = await findMatchForUser(req.user);
    if (!match) {
      return res.status(404).json({ error: { code: 'NO_MATCH', message: 'No match available right now' } });
    }
    res.json({ match });
  } catch (err) {
    console.error('match find error', err);
    const status = err.status || 500;
    res.status(status).json({ error: { code: err.code || 'MATCH_FAILED', message: err.message } });
  }
});

export default router;
