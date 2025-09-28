import User from '../models/User.js';
import Yap from '../models/Yap.js';

const randomPick = (items) => items[Math.floor(Math.random() * items.length)];

export const findMatchForUser = async (user) => {
  if (!user || !user.interests?.length) {
    throw Object.assign(new Error('Profile incomplete'), { status: 400, code: 'PROFILE_INCOMPLETE' });
  }
  const activeYaps = await Yap.find({ participants: user._id, isActive: true }).lean();
  const activePartnerIds = new Set();
  activeYaps.forEach((yap) => {
    yap.participants
      .filter((id) => id.toString() !== user._id.toString())
      .forEach((id) => activePartnerIds.add(id.toString()));
  });

  const candidates = await User.find({
    _id: { $ne: user._id },
    interests: { $in: user.interests }
  }).lean();

  const filtered = candidates.filter((candidate) => !activePartnerIds.has(candidate._id.toString()));
  if (!filtered.length) {
    return null;
  }
  const match = randomPick(filtered);
  return {
    _id: match._id.toString(),
    displayName: match.displayName,
    interests: match.interests,
    profileImageUrl: match.profileImageUrl
  };
};

export default { findMatchForUser };
