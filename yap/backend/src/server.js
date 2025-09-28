import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { connectMongo } from './services/mongo.js';
import { ensureContainers } from './services/azure.js';
import authRoutes from './routes/auth.js';
import profileRoutes from './routes/profile.js';
import matchRoutes from './routes/match.js';
import chatRoutes from './routes/chat.js';
import mediaRoutes from './routes/media.js';
import { notFoundHandler, errorHandler } from './middleware/error.js';

const app = express();

const {
  PORT = 4000,
  CLIENT_ORIGIN = 'http://localhost:5173',
  NODE_ENV = 'development'
} = process.env;

app.use(morgan('dev'));
app.use(express.json({ limit: '5mb' }));
app.use(cookieParser());
app.use(
  cors({
    origin: CLIENT_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
  })
);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/match', matchRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/media', mediaRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

const start = async () => {
  try {
    await connectMongo();
    await ensureContainers();
    app.listen(PORT, () => {
      console.log(`Yap backend listening on port ${PORT} (${NODE_ENV})`);
    });
  } catch (err) {
    console.error('Failed to start server', err);
    process.exit(1);
  }
};

start();
