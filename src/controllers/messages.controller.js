// src/controllers/messages.controller.js

const prisma = require('../services/prisma');

// ─── Shared message select ────────────────────────────────────────────────────

const messageSelect = {
  id:         true,
  content:    true,
  senderId:   true,
  receiverId: true,
  groupId:    true,
  createdAt:  true,
  sender: { select: { id: true, username: true } },
};

// ─── DM ───────────────────────────────────────────────────────────────────────

/**
 * GET /messages/dm/:otherUserId
 * Returns full DM conversation between current user and otherUser.
 */
async function getDmMessages(req, res) {
  try {
    const { id: myId }          = req.user;
    const { otherUserId }       = req.params;
    const page  = parseInt(req.query.page  || '1',  10);
    const limit = parseInt(req.query.limit || '50', 10);

    const messages = await prisma.message.findMany({
      where: {
        groupId: null,
        OR: [
          { senderId: myId,      receiverId: otherUserId },
          { senderId: otherUserId, receiverId: myId },
        ],
      },
      select:  messageSelect,
      orderBy: { createdAt: 'asc' },
      skip:    (page - 1) * limit,
      take:    limit,
    });

    return res.json(messages);
  } catch (err) {
    console.error('[Messages] getDmMessages error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

/**
 * POST /messages/dm
 * Body: { receiverId, content }
 * Saves a DM via REST (socket path is preferred for real-time, this is fallback).
 */
async function sendDmMessage(req, res) {
  try {
    const { receiverId, content } = req.body;
    if (!receiverId || !content?.trim()) {
      return res.status(400).json({ message: 'receiverId and content are required.' });
    }

    const msg = await prisma.message.create({
      data: {
        content:    content.trim(),
        senderId:   req.user.id,
        receiverId,
      },
      select: messageSelect,
    });

    return res.status(201).json(msg);
  } catch (err) {
    console.error('[Messages] sendDmMessage error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

// ─── Group ────────────────────────────────────────────────────────────────────

/**
 * GET /messages/group/:groupId
 */
async function getGroupMessages(req, res) {
  try {
    const { id: userId } = req.user;
    const { groupId }    = req.params;
    const page  = parseInt(req.query.page  || '1',  10);
    const limit = parseInt(req.query.limit || '50', 10);

    // Verify membership
    const member = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId, groupId } },
    });
    if (!member) {
      return res.status(403).json({ message: 'You are not a member of this group.' });
    }

    const messages = await prisma.message.findMany({
      where:   { groupId },
      select:  messageSelect,
      orderBy: { createdAt: 'asc' },
      skip:    (page - 1) * limit,
      take:    limit,
    });

    return res.json(messages);
  } catch (err) {
    console.error('[Messages] getGroupMessages error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

/**
 * POST /messages/group
 * Body: { groupId, content }
 */
async function sendGroupMessage(req, res) {
  try {
    const { groupId, content } = req.body;
    if (!groupId || !content?.trim()) {
      return res.status(400).json({ message: 'groupId and content are required.' });
    }

    const msg = await prisma.message.create({
      data: {
        content:  content.trim(),
        senderId: req.user.id,
        groupId,
      },
      select: messageSelect,
    });

    return res.status(201).json(msg);
  } catch (err) {
    console.error('[Messages] sendGroupMessage error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

module.exports = { getDmMessages, sendDmMessage, getGroupMessages, sendGroupMessage };
