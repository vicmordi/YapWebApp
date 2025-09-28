export const enforceDailyYapLimit = async (req, res, next) => {
  try {
    const user = req.user;
    const now = new Date();
    if (!user.yapsTodayResetAt || now >= user.yapsTodayResetAt) {
      // Move to next day midnight in server-local time to approximate the user's next reset window
      const localMidnight = new Date(now);
      localMidnight.setHours(24, 0, 0, 0);
      user.yapsToday = 0;
      user.yapsTodayResetAt = localMidnight;
      await user.save();
    }
    if (user.yapsToday >= 3) {
      return res.status(429).json({ error: { code: 'YAP_LIMIT', message: 'Daily yap limit reached' } });
    }
    return next();
  } catch (err) {
    console.error('enforceDailyYapLimit error', err);
    return res.status(500).json({ error: { code: 'RATE_LIMIT_ERROR', message: 'Unable to evaluate yap limit' } });
  }
};

export const incrementYapCount = async (user) => {
  user.yapsToday += 1;
  await user.save();
};
