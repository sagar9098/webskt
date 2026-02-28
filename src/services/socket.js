// src/services/socket.js

const { verifyToken }      = require('./jwt');
const prisma               = require('./prisma');
const { sendNotification } = require('./firebase');

const messageSelect = {
  id:         true,
  content:    true,
  senderId:   true,
  receiverId: true,
  groupId:    true,
  createdAt:  true,
  sender: { select: { id: true, username: true } },
};

// Track online users: userId → Set of socketIds
const onlineUsers = new Map();

function isOnline(userId) {
  const sockets = onlineUsers.get(userId);
  return sockets && sockets.size > 0;
}

function addOnline(userId, socketId) {
  if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
  onlineUsers.get(userId).add(socketId);
}

function removeOnline(userId, socketId) {
  const sockets = onlineUsers.get(userId);
  if (sockets) {
    sockets.delete(socketId);
    if (sockets.size === 0) onlineUsers.delete(userId);
  }
}

function dmRoom(a, b) {
  return `dm_${[a, b].sort().join('_')}`;
}

function groupRoom(groupId) {
  return `group_${groupId}`;
}

function initSocket(io) {
  // ── JWT middleware ───────────────────────────────────────────────────────────
  io.use((socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '');
      if (!token) return next(new Error('No token'));
      const decoded = verifyToken(token);
      socket.user = { id: decoded.id, username: decoded.username };
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const { id: userId, username } = socket.user;
    addOnline(userId, socket.id);
    console.log(`[Socket] 🟢 ${username} connected (${socket.id})`);

    // Broadcast online status
    socket.broadcast.emit('user_online', { userId });

    // ── join_room ──────────────────────────────────────────────────────────────
    socket.on('join_room', ({ room }) => {
      if (room) socket.join(room);
    });

    // ── leave_room ─────────────────────────────────────────────────────────────
    socket.on('leave_room', ({ room }) => {
      if (room) socket.leave(room);
    });

    // ── send_message ───────────────────────────────────────────────────────────
    socket.on('send_message', async (data) => {
      try {
        const { type, content, room } = data;
        if (!content?.trim() || !room) {
          return socket.emit('error', { message: 'content and room required' });
        }

        let savedMessage;

        // ── DM ─────────────────────────────────────────────────────────────────
        if (type === 'dm') {
          const { receiverId } = data;
          if (!receiverId) return socket.emit('error', { message: 'receiverId required' });

          savedMessage = await prisma.message.create({
            data: { content: content.trim(), senderId: userId, receiverId },
            select: messageSelect,
          });

          io.to(dmRoom(userId, receiverId)).emit('new_message', savedMessage);

          // FCM if receiver is offline
          if (!isOnline(receiverId)) {
            const receiver = await prisma.user.findUnique({
              where:  { id: receiverId },
              select: { fcmToken: true },
            });
            if (receiver?.fcmToken) {
              await sendNotification(
                receiver.fcmToken,
                `💬 ${username}`,
                content.trim(),
                { type: 'dm', senderId: userId, senderName: username, room }
              );
            }
          }

        // ── Group ──────────────────────────────────────────────────────────────
        } else if (type === 'group') {
          const { groupId } = data;
          if (!groupId) return socket.emit('error', { message: 'groupId required' });

          // Verify membership
          const membership = await prisma.groupMember.findUnique({
            where: { userId_groupId: { userId, groupId } },
          });
          if (!membership) {
            return socket.emit('error', { message: 'Not a group member' });
          }

          savedMessage = await prisma.message.create({
            data: { content: content.trim(), senderId: userId, groupId },
            select: messageSelect,
          });

          io.to(groupRoom(groupId)).emit('new_message', savedMessage);

          // FCM to all offline group members
          const group = await prisma.group.findUnique({
            where: { id: groupId },
            select: {
              name: true,
              members: {
                where:  { userId: { not: userId } },
                select: { user: { select: { id: true, fcmToken: true } } },
              },
            },
          });

          if (group) {
            for (const { user: member } of group.members) {
              if (!isOnline(member.id) && member.fcmToken) {
                await sendNotification(
                  member.fcmToken,
                  `💬 ${group.name}`,
                  `${username}: ${content.trim()}`,
                  { type: 'group', groupId, senderName: username, room }
                );
              }
            }
          }

        } else {
          socket.emit('error', { message: `Unknown type: ${type}` });
        }
      } catch (err) {
        console.error('[Socket] send_message error:', err);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // ── typing ─────────────────────────────────────────────────────────────────
    socket.on('typing',      ({ room }) => {
      if (room) socket.to(room).emit('typing',      { userId, username, room });
    });
    socket.on('stop_typing', ({ room }) => {
      if (room) socket.to(room).emit('stop_typing', { userId, username, room });
    });

    // ── disconnect ─────────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      removeOnline(userId, socket.id);
      socket.broadcast.emit('user_offline', { userId });
      console.log(`[Socket] 🔴 ${username} disconnected`);
    });
  });
}

module.exports = { initSocket, dmRoom, groupRoom };
