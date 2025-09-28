import { Router } from 'express';
import { z } from 'zod';
import { authRequired, requireCsrf } from '../middleware/auth.js';
import { enforceDailyYapLimit, incrementYapCount } from '../middleware/rateLimit.js';
import User from '../models/User.js';
import Yap from '../models/Yap.js';
import Message from '../models/Message.js';
import { createMessageUploadSas } from '../services/azure.js';

const router = Router();

const startSchema = z.object({
  partnerUserId: z.string()
});

const messageSchema = z.object({
  type: z.enum(['audio', 'image', 'text']),
  text: z.string().optional(),
  mediaUrl: z.string().url().optional()
});

const mediaSasSchema = z.object({
  type: z.enum(['audio', 'image']),
  contentType: z.string(),
  sizeBytes: z.number().positive()
});

const publicUser = (user) => ({
  _id: user._id?.toString(),
  displayName: user.displayName,
  interests: user.interests,
  profileImageUrl: user.profileImageUrl
});

const toMessageDto = (doc) => ({
  _id: doc._id?.toString(),
  yapId: doc.yapId?.toString(),
  senderId: doc.senderId?.toString(),
  type: doc.type,
  text: doc.text,
  mediaUrl: doc.mediaUrl,
  createdAt: doc.createdAt
});

const ensureParticipant = async (userId, yapId) => {
  const yap = await Yap.findById(yapId);
  if (!yap) {
    const err = new Error('Yap not found');
    err.status = 404;
    err.code = 'YAP_NOT_FOUND';
    throw err;
  }
  const isParticipant = yap.participants.some((id) => id.toString() === userId.toString());
  if (!isParticipant) {
    const err = new Error('Not part of this yap');
    err.status = 403;
    err.code = 'NOT_PARTICIPANT';
    throw err;
  }
  return yap;
};

router.post('/start', authRequired, requireCsrf, enforceDailyYapLimit, async (req, res) => {
  try {
    const { partnerUserId } = startSchema.parse(req.body);
    if (partnerUserId === req.user._id.toString()) {
      return res.status(400).json({ error: { code: 'INVALID_PARTNER', message: 'Cannot start a yap with yourself' } });
    }
    const partner = await User.findById(partnerUserId);
    if (!partner) {
      return res.status(404).json({ error: { code: 'PARTNER_NOT_FOUND', message: 'Partner not found' } });
    }
    let yap = await Yap.findOne({
      participants: { $all: [req.user._id, partner._id] },
      isActive: true
    });
    if (!yap) {
      yap = await Yap.create({ participants: [req.user._id, partner._id], isActive: true });
      await incrementYapCount(req.user);
    }
    res.json({
      yap: {
        _id: yap._id,
        participants: yap.participants,
        startedAt: yap.startedAt,
        isActive: yap.isActive
      },
      partner: publicUser(partner)
    });
  } catch (err) {
    console.error('chat start error', err);
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: { code: 'INVALID_INPUT', message: err.errors.map((e) => e.message).join(', ') } });
    }
    const status = err.status || 500;
    res.status(status).json({ error: { code: err.code || 'CHAT_START_FAILED', message: err.message } });
  }
});

router.get('/:yapId/messages', authRequired, async (req, res) => {
  try {
    await ensureParticipant(req.user._id, req.params.yapId);
    const messages = await Message.find({ yapId: req.params.yapId })
      .sort({ createdAt: 1 })
      .lean();
    res.json({ messages: messages.map(toMessageDto) });
  } catch (err) {
    console.error('get messages error', err);
    const status = err.status || 500;
    res.status(status).json({ error: { code: err.code || 'MESSAGES_FETCH_FAILED', message: err.message } });
  }
});

router.post('/:yapId/messages', authRequired, requireCsrf, async (req, res) => {
  try {
    await ensureParticipant(req.user._id, req.params.yapId);
    const data = messageSchema.parse(req.body);
    if (data.type === 'text' && !data.text) {
      return res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Text is required for text messages' } });
    }
    if (['audio', 'image'].includes(data.type) && !data.mediaUrl) {
      return res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'mediaUrl required for media messages' } });
    }
    const message = await Message.create({
      yapId: req.params.yapId,
      senderId: req.user._id,
      type: data.type,
      text: data.text,
      mediaUrl: data.mediaUrl
    });
    res.json({ message: toMessageDto(message) });
  } catch (err) {
    console.error('post message error', err);
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: { code: 'INVALID_INPUT', message: err.errors.map((e) => e.message).join(', ') } });
    }
    const status = err.status || 500;
    res.status(status).json({ error: { code: err.code || 'MESSAGE_SEND_FAILED', message: err.message } });
  }
});

router.post('/:yapId/media/sas', authRequired, requireCsrf, async (req, res) => {
  try {
    await ensureParticipant(req.user._id, req.params.yapId);
    const { type, contentType, sizeBytes } = mediaSasSchema.parse(req.body);
    const extension = type === 'audio' ? (contentType === 'audio/mpeg' ? 'mp3' : 'webm') : contentType === 'image/png' ? 'png' : 'jpg';
    const sas = createMessageUploadSas({
      yapId: req.params.yapId,
      extension,
      contentType,
      sizeBytes,
      category: type
    });
    res.json(sas);
  } catch (err) {
    console.error('chat media sas error', err);
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: { code: 'INVALID_INPUT', message: err.errors.map((e) => e.message).join(', ') } });
    }
    const status = err.status || 500;
    res.status(status).json({ error: { code: err.code || 'MEDIA_SAS_FAILED', message: err.message } });
  }
});

export default router;
