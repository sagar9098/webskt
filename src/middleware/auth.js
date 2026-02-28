// src/middleware/auth.js

const { verifyToken } = require('../services/jwt');

/**
 * Express middleware — validates Bearer JWT and attaches req.user.
 */
function authMiddleware(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided.' });
    }

    const token = header.slice(7);
    const decoded = verifyToken(token);

    req.user = { id: decoded.id, username: decoded.username };
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
}

module.exports = authMiddleware;
