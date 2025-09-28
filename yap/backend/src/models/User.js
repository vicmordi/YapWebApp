import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    email: { type: String, unique: true, required: true, index: true },
    passwordHash: { type: String, required: true },
    displayName: { type: String, required: true },
    interests: { type: [String], default: [] },
    profileImageUrl: { type: String },
    yapsToday: { type: Number, default: 0 },
    yapsTodayResetAt: { type: Date },
    createdAt: { type: Date, default: Date.now }
  },
  { minimize: false }
);

const User = mongoose.models.User || mongoose.model('User', userSchema);
export default User;
