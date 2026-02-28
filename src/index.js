// src/index.js

require('dotenv').config();

const express      = require('express');
const http         = require('http');
const path         = require('path');
const { Server }   = require('socket.io');
const cors         = require('cors');

const authRoutes     = require('./routes/auth.routes');
const usersRoutes    = require('./routes/users.routes');
const groupsRoutes   = require('./routes/groups.routes');
const messagesRoutes = require('./routes/messages.routes');
const { initSocket }   = require('./services/socket');
const { initFirebase } = require('./services/firebase');
const prisma           = require('./services/prisma');

const app    = express();
const server = http.createServer(app);

// ─── Firebase ─────────────────────────────────────────────────────────────────
initFirebase();

// ─── Socket.io ────────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin:  process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
  },
  transports: ['websocket', 'polling'],
});

initSocket(io);

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/auth',     authRoutes);
app.use('/users',    usersRoutes);
app.use('/groups',   groupsRoutes);
app.use('/messages', messagesRoutes);

// Health check
app.get('/health', (_req, res) =>
  res.json({ status: 'ok', timestamp: new Date() })
);

// Debug DB
app.get('/debug/db', async (_req, res) => {
  try {
    const [users, groups, messages] = await Promise.all([
      prisma.user.count(),
      prisma.group.count(),
      prisma.message.count(),
    ]);
    return res.json({ status: 'connected', users, groups, messages });
  } catch (err) {
    return res.status(500).json({ status: 'error', error: err.message });
  }
});

// ─── Serve Flutter Web ────────────────────────────────────────────────────────
const publicDir = path.join(__dirname, '..', 'public');

// Serve static files (JS, CSS, assets, etc.)
app.use(express.static(publicDir));

// For any non-API route, return index.html (Flutter handles its own routing)
app.get('*', (req, res) => {
  // Don't intercept API or socket routes
  if (
    req.path.startsWith('/auth') ||
    req.path.startsWith('/users') ||
    req.path.startsWith('/groups') ||
    req.path.startsWith('/messages') ||
    req.path.startsWith('/health') ||
    req.path.startsWith('/socket.io')
  ) {
    return res.status(404).json({ message: 'Route not found.' });
  }

  const indexPath = path.join(publicDir, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(404).json({ message: 'Flutter web not deployed yet. Add build/web contents to /public folder.' });
    }
  });
});

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '3000', 10);

async function start() {
  try {
    await prisma.$connect();
    console.log('✅ Database connected');

    server.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`🌐 Flutter web → http://localhost:${PORT}`);
      console.log(`🔌 Socket.io ready`);
      console.log(`📋 Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    // Keep-alive ping for Render free tier
    if (process.env.NODE_ENV === 'production' && process.env.RENDER_EXTERNAL_URL) {
      setInterval(() => {
        http.get(`${process.env.RENDER_EXTERNAL_URL}/health`).on('error', () => {});
      }, 14 * 60 * 1000);
    }
  } catch (err) {
    console.error('❌ Failed to start:', err);
    process.exit(1);
  }
}

process.on('SIGINT',  async () => { await prisma.$disconnect(); process.exit(0); });
process.on('SIGTERM', async () => { await prisma.$disconnect(); process.exit(0); });

start();