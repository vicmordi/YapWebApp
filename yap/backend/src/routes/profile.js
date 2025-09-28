import { Router } from 'express';
import { z } from 'zod';
import { authRequired, requireCsrf } from '../middleware/auth.js';
import { createProfileUploadSas } from '../services/azure.js';

const router = Router();

const profileSchema = z.object({
  displayName: z.string().min(2).max(50),
  interests: z.array(z.string().min(1)).max(12)
});

const sasSchema = z.object({
  contentType: z.string(),
  sizeBytes: z.number().positive()
});

const publicUser = (user) => ({
  _id: user._id?.toString(),
  email: user.email,
  displayName: user.displayName,
  interests: user.interests,
  profileImageUrl: user.profileImageUrl,
  yapsToday: user.yapsToday,
  yapsTodayResetAt: user.yapsTodayResetAt
});

router.get('/', authRequired, async (req, res) => {
  res.json({ user: publicUser(req.user) });
});

router.put('/', authRequired, requireCsrf, async (req, res) => {
  try {
    const { displayName, interests } = profileSchema.parse(req.body);
    req.user.displayName = displayName;
    req.user.interests = interests;
    await req.user.save();
    res.json({ user: publicUser(req.user) });
  } catch (err) {
    console.error('update profile error', err);
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: { code: 'INVALID_INPUT', message: err.errors.map((e) => e.message).join(', ') } });
    }
    res.status(500).json({ error: { code: 'PROFILE_UPDATE_FAILED', message: 'Unable to update profile' } });
  }
});

router.post('/image/sas', authRequired, requireCsrf, async (req, res) => {
  try {
    const { contentType, sizeBytes } = sasSchema.parse(req.body);
    const sas = createProfileUploadSas({ userId: req.user._id.toString(), contentType, sizeBytes });
    res.json(sas);
  } catch (err) {
    console.error('profile image sas error', err);
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: { code: 'INVALID_INPUT', message: err.errors.map((e) => e.message).join(', ') } });
    }
    const status = err.status || 500;
    res.status(status).json({ error: { code: err.code || 'PROFILE_IMAGE_SAS_FAILED', message: err.message } });
  }
});

router.post('/image/confirm', authRequired, requireCsrf, async (req, res) => {
  const { imageUrl } = req.body;
  if (!imageUrl) {
    return res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'imageUrl required' } });
  }
  req.user.profileImageUrl = imageUrl;
  await req.user.save();
  res.json({ user: publicUser(req.user) });
});

export default router;
