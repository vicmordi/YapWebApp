import mongoose from 'mongoose';

const yapSchema = new mongoose.Schema(
  {
    participants: { type: [mongoose.Schema.Types.ObjectId], ref: 'User', required: true },
    startedAt: { type: Date, default: Date.now },
    endedAt: { type: Date },
    isActive: { type: Boolean, default: true }
  },
  { minimize: false }
);

yapSchema.index({ participants: 1 });

const Yap = mongoose.models.Yap || mongoose.model('Yap', yapSchema);
export default Yap;
