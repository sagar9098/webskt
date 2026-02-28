// src/controllers/users.controller.js

const prisma = require('../services/prisma');

const userSelect = { id: true, username: true, createdAt: true };

// ─── GET /users ───────────────────────────────────────────────────────────────
async function getAllUsers(req, res) {
  try {
    const users = await prisma.user.findMany({
      select: userSelect,
      orderBy: { username: 'asc' },
    });
    return res.json(users);
  } catch (err) {
    console.error('[Users] getAllUsers error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

// ─── GET /users/search?q=query ────────────────────────────────────────────────
async function searchUsers(req, res) {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.json([]);

    const users = await prisma.user.findMany({
      where: {
        username: { contains: q, mode: 'insensitive' },
        NOT: { id: req.user.id }, // exclude self
      },
      select: userSelect,
      orderBy: { username: 'asc' },
      take: 20,
    });
    return res.json(users);
  } catch (err) {
    console.error('[Users] searchUsers error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

// ─── GET /users/recent-chats ──────────────────────────────────────────────────
// Returns users the current user has exchanged DMs with, ordered by last message
async function getRecentChats(req, res) {
  try {
    const myId = req.user.id;

    // Get all DM messages involving current user
    const messages = await prisma.message.findMany({
      where: {
        groupId: null,
        OR: [{ senderId: myId }, { receiverId: myId }],
      },
      select: {
        senderId:   true,
        receiverId: true,
        content:    true,
        createdAt:  true,
        sender:   { select: userSelect },
        receiver: { select: userSelect },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Build a map of peerId → { user, lastMessage, lastAt }
    const peerMap = new Map();
    for (const msg of messages) {
      const peer   = msg.senderId === myId ? msg.receiver : msg.sender;
      if (!peer) continue;
      if (!peerMap.has(peer.id)) {
        peerMap.set(peer.id, {
          user:        peer,
          lastMessage: msg.content,
          lastAt:      msg.createdAt,
        });
      }
    }

    return res.json(Array.from(peerMap.values()));
  } catch (err) {
    console.error('[Users] getRecentChats error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

// ─── GET /users/:id ───────────────────────────────────────────────────────────
async function getUserById(req, res) {
  try {
    const user = await prisma.user.findUnique({
      where:  { id: req.params.id },
      select: userSelect,
    });
    if (!user) return res.status(404).json({ message: 'User not found.' });
    return res.json(user);
  } catch (err) {
    console.error('[Users] getUserById error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

// ─── PUT /users/fcm-token ─────────────────────────────────────────────────────
async function updateFcmToken(req, res) {
  try {
    const { fcmToken } = req.body;
    if (!fcmToken) return res.status(400).json({ message: 'fcmToken is required.' });

    await prisma.user.update({
      where: { id: req.user.id },
      data:  { fcmToken },
    });
    return res.json({ message: 'FCM token updated.' });
  } catch (err) {
    console.error('[Users] updateFcmToken error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

module.exports = { getAllUsers, searchUsers, getRecentChats, getUserById, updateFcmToken };
