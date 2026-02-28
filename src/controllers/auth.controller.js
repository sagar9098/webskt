// src/controllers/auth.controller.js

const bcrypt = require('bcryptjs');
const prisma  = require('../services/prisma');
const { signToken } = require('../services/jwt');

/**
 * POST /auth/login
 *
 * Body: { username, password }
 *
 * Behaviour:
 *   - Username not found → auto-create account, return token
 *   - Username found + password matches → return token
 *   - Username found + password wrong → 401
 */
async function login(req, res) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required.' });
    }

    if (username.length < 2 || username.length > 32) {
      return res.status(400).json({ message: 'Username must be 2–32 characters.' });
    }

    let user = await prisma.user.findUnique({ where: { username } });

    if (!user) {
      // ── Auto-register ──────────────────────────────────────────────────────
      const hashed = await bcrypt.hash(password, 10);
      user = await prisma.user.create({
        data: { username, password: hashed },
      });
    } else {
      // ── Verify password ────────────────────────────────────────────────────
      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        return res.status(401).json({ message: 'Incorrect password.' });
      }
    }

    const token = signToken({ id: user.id, username: user.username });

    return res.json({
      token,
      user: {
        id:        user.id,
        username:  user.username,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    console.error('[Auth] login error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

module.exports = { login };
