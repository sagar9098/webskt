// src/routes/users.routes.js

const express = require('express');
const {
  getAllUsers,
  searchUsers,
  getRecentChats,
  getUserById,
  updateFcmToken,
} = require('../controllers/users.controller');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

router.get('/search',       searchUsers);    // GET /users/search?q=alice
router.get('/recent-chats', getRecentChats); // GET /users/recent-chats
router.get('/',             getAllUsers);     // GET /users
router.get('/:id',          getUserById);    // GET /users/:id
router.put('/fcm-token',    updateFcmToken); // PUT /users/fcm-token

module.exports = router;
