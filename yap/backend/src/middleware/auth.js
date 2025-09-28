import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const { JWT_SECRET = 'dev_secret', COOKIE_NAME = 'yap_token' } = process.env;

export const authRequired = async (req, res, next) => {
  try {
    const token = req.cookies[COOKIE_NAME];
    if (!token) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    }
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(payload.sub);
    if (!user) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'User not found' } });
    }
    req.user = user;
    req.csrfToken = payload.csrfToken;
    next();
  } catch (err) {
    console.error('authRequired error', err);
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid token' } });
  }
};

export const optionalAuth = async (req, res, next) => {
  try {
    const token = req.cookies[COOKIE_NAME];
    if (!token) {
      return next();
    }
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(payload.sub);
    if (user) {
      req.user = user;
      req.csrfToken = payload.csrfToken;
    }
  } catch (err) {
    console.warn('optionalAuth token parse failed');
  }
  next();
};

export const requireCsrf = (req, res, next) => {
  const requestToken = req.headers['x-csrf-token'];
  if (!req.csrfToken) {
    return res.status(403).json({ error: { code: 'CSRF_MISSING', message: 'CSRF token missing from session' } });
  }
  if (!requestToken || requestToken !== req.csrfToken) {
    return res.status(403).json({ error: { code: 'CSRF_INVALID', message: 'Invalid CSRF token' } });
  }
  return next();
};
