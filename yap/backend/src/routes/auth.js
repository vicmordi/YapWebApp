import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { z } from 'zod';
import User from '../models/User.js';
import { optionalAuth, authRequired } from '../middleware/auth.js';

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(2).max(50)
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

const { JWT_SECRET = 'dev_secret', COOKIE_NAME = 'yap_token', COOKIE_SECURE = 'false' } = process.env;

const buildCookieOptions = () => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: COOKIE_SECURE === 'true',
  maxAge: 1000 * 60 * 60 * 24 * 7
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

const issueToken = (user) => {
  const csrfToken = crypto.randomBytes(16).toString('hex');
  const token = jwt.sign(
    {
      sub: user._id.toString(),
      csrfToken
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
  return { token, csrfToken };
};

router.post('/register', async (req, res) => {
  try {
    const { email, password, displayName } = registerSchema.parse(req.body);
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ error: { code: 'EMAIL_IN_USE', message: 'Email already registered' } });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ email, passwordHash, displayName });
    const { token, csrfToken } = issueToken(user);
    res.cookie(COOKIE_NAME, token, buildCookieOptions());
    res.json({ user: publicUser(user), csrfToken });
  } catch (err) {
    console.error('register error', err);
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: { code: 'INVALID_INPUT', message: err.errors.map((e) => e.message).join(', ') } });
    }
    return res.status(500).json({ error: { code: 'REGISTER_FAILED', message: 'Unable to register' } });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } });
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } });
    }
    const { token, csrfToken } = issueToken(user);
    res.cookie(COOKIE_NAME, token, buildCookieOptions());
    res.json({ user: publicUser(user), csrfToken });
  } catch (err) {
    console.error('login error', err);
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: { code: 'INVALID_INPUT', message: err.errors.map((e) => e.message).join(', ') } });
    }
    return res.status(500).json({ error: { code: 'LOGIN_FAILED', message: 'Unable to login' } });
  }
});

router.post('/logout', optionalAuth, (req, res) => {
  res.clearCookie(COOKIE_NAME, buildCookieOptions());
  res.json({ success: true });
});

router.get('/me', optionalAuth, (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
  }
  res.json({ user: publicUser(req.user), csrfToken: req.csrfToken });
});

router.get('/csrf', authRequired, (req, res) => {
  res.json({ csrfToken: req.csrfToken });
});

export default router;
