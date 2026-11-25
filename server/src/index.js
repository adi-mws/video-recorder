import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Server } from 'socket.io';
import { connectDB, isDbConnected } from './config/db.js';
import { requireAuth, socketAuthMiddleware } from './middleware/auth.js';
import { createAuthRouter } from './routes/auth.js';
import { createLocationRouter } from './routes/location.js';
import { registerSocketHandlers } from './socket/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const PORT = Number(process.env.PORT) || 5000;
const CLIENT_URLS = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((u) => u.trim())
  .filter(Boolean);
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/video_recorder_mern';

const corsOrigin = (origin, callback) => {
  // Native mobile clients (Expo/React Native) have no browser Origin header.
  if (!origin || CLIENT_URLS.includes(origin)) {
    return callback(null, true);
  }
  try {
    const { hostname } = new URL(origin);
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.')
    ) {
      return callback(null, true);
    }
  } catch {
    // Fall through to reject malformed origins
  }
  return callback(new Error(`Origin ${origin} not allowed by CORS`));
};

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  maxHttpBufferSize: 5e6,
  pingTimeout: 20000,
  pingInterval: 10000,
  cors: {
    origin: corsOrigin,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true,
  },
});

io.engine.on('connection_error', (err) => {
  console.warn('[Socket.IO Engine Error]', err.code, err.message);
});

app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
  })
);
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    dbConnected: isDbConnected(),
    onlineClients: io.engine.clientsCount,
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth', createAuthRouter());
app.use('/api/location', requireAuth, createLocationRouter(io));

app.use((err, _req, res, _next) => {
  console.error('[Server Error]', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

io.use(socketAuthMiddleware);
registerSocketHandlers(io);

function getLanAddresses() {
  const nets = os.networkInterfaces();
  const ips = [];
  for (const entries of Object.values(nets)) {
    for (const net of entries || []) {
      if (net.family === 'IPv4' && !net.internal) {
        ips.push(net.address);
      }
    }
  }
  return ips;
}

async function startServer() {
  await connectDB(MONGO_URI);
  server.listen(PORT, () => {
    console.log(`[Server] Running at http://localhost:${PORT}`);
    for (const ip of getLanAddresses()) {
      console.log(`[Server] LAN URL for phone: http://${ip}:${PORT}`);
    }
    console.log(`[Server] CORS allowed origins: ${CLIENT_URLS.join(', ')}`);
  });
}

startServer();

