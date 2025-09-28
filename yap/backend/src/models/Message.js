import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    yapId: { type: mongoose.Schema.Types.ObjectId, ref: 'Yap', required: true, index: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['audio', 'image', 'text'], required: true },
    text: { type: String },
    mediaUrl: { type: String },
    createdAt: { type: Date, default: Date.now }
  },
  { minimize: false }
);

const Message = mongoose.models.Message || mongoose.model('Message', messageSchema);
export default Message;
