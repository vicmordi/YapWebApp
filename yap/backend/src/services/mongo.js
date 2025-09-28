import mongoose from 'mongoose';

let connected = false;

export const connectMongo = async (uri) => {
  if (connected) return mongoose.connection;
  const mongoUri = uri || process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI not configured');
  }
  mongoose.set('strictQuery', true);
  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 5000
  });
  connected = true;
  return mongoose.connection;
};

export default mongoose;
