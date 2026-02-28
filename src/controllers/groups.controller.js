// src/controllers/groups.controller.js

const prisma = require('../services/prisma');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const groupWithMembers = {
  id: true,
  name: true,
  createdById: true,
  createdAt: true,
  members: {
    select: {
      user: { select: { id: true, username: true, createdAt: true } },
    },
  },
};

function formatGroup(group) {
  return {
    ...group,
    members: group.members.map((m) => m.user),
  };
}

// ─── Controllers ─────────────────────────────────────────────────────────────

/**
 * GET /groups
 * Returns all groups the current user is a member of.
 */
async function getMyGroups(req, res) {
  try {
    const groups = await prisma.group.findMany({
      where: { members: { some: { userId: req.user.id } } },
      select: groupWithMembers,
      orderBy: { createdAt: 'desc' },
    });
    return res.json(groups.map(formatGroup));
  } catch (err) {
    console.error('[Groups] getMyGroups error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

/**
 * GET /groups/all
 * Returns all groups (for discovery / join flow).
 */
async function getAllGroups(req, res) {
  try {
    const groups = await prisma.group.findMany({
      select: groupWithMembers,
      orderBy: { createdAt: 'desc' },
    });
    return res.json(groups.map(formatGroup));
  } catch (err) {
    console.error('[Groups] getAllGroups error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

/**
 * GET /groups/:id
 */
async function getGroupById(req, res) {
  try {
    const group = await prisma.group.findUnique({
      where: { id: req.params.id },
      select: groupWithMembers,
    });
    if (!group) return res.status(404).json({ message: 'Group not found.' });
    return res.json(formatGroup(group));
  } catch (err) {
    console.error('[Groups] getGroupById error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

/**
 * POST /groups
 * Body: { name }
 * Creates a group and adds the creator as the first member.
 */
async function createGroup(req, res) {
  try {
    const { name } = req.body;
    if (!name || name.trim().length < 1) {
      return res.status(400).json({ message: 'Group name is required.' });
    }

    const group = await prisma.group.create({
      data: {
        name: name.trim(),
        createdById: req.user.id,
        members: {
          create: { userId: req.user.id },
        },
      },
      select: groupWithMembers,
    });

    return res.status(201).json(formatGroup(group));
  } catch (err) {
    console.error('[Groups] createGroup error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

/**
 * POST /groups/:id/join
 * Adds the current user to the group.
 */
async function joinGroup(req, res) {
  try {
    const { id: groupId } = req.params;
    const { id: userId }  = req.user;

    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group) return res.status(404).json({ message: 'Group not found.' });

    // Upsert so joining twice is idempotent
    await prisma.groupMember.upsert({
      where:  { userId_groupId: { userId, groupId } },
      update: {},
      create: { userId, groupId },
    });

    const updated = await prisma.group.findUnique({
      where: { id: groupId },
      select: groupWithMembers,
    });

    return res.json(formatGroup(updated));
  } catch (err) {
    console.error('[Groups] joinGroup error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

/**
 * DELETE /groups/:id/leave
 */
async function leaveGroup(req, res) {
  try {
    await prisma.groupMember.deleteMany({
      where: { userId: req.user.id, groupId: req.params.id },
    });
    return res.json({ message: 'Left group.' });
  } catch (err) {
    console.error('[Groups] leaveGroup error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

module.exports = { getMyGroups, getAllGroups, getGroupById, createGroup, joinGroup, leaveGroup };
