// src/services/jwt.js

const jwt = require('jsonwebtoken');

const SECRET  = process.env.JWT_SECRET  || 'fallback-dev-secret';
const EXPIRES = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Sign a JWT for a user.
 * @param {{ id: string, username: string }} payload
 * @returns {string} signed token
 */
function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES });
}

/**
 * Verify and decode a JWT.
 * Throws if invalid or expired.
 * @param {string} token
 * @returns {{ id: string, username: string, iat: number, exp: number }}
 */
function verifyToken(token) {
  return jwt.verify(token, SECRET);
}

module.exports = { signToken, verifyToken };
