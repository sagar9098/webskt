// src/routes/messages.routes.js

const express = require('express');
const {
  getDmMessages,
  sendDmMessage,
  getGroupMessages,
  sendGroupMessage,
} = require('../controllers/messages.controller');
const auth = require('../middleware/auth');

const router = express.Router();

router.use(auth);

// DM
router.get('/dm/:otherUserId', getDmMessages);
router.post('/dm',             sendDmMessage);

// Group
router.get('/group/:groupId',  getGroupMessages);
router.post('/group',          sendGroupMessage);

module.exports = router;
