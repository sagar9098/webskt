// src/routes/groups.routes.js

const express = require('express');
const {
  getMyGroups,
  getAllGroups,
  getGroupById,
  createGroup,
  joinGroup,
  leaveGroup,
} = require('../controllers/groups.controller');
const auth = require('../middleware/auth');

const router = express.Router();

router.use(auth);

router.get('/',      getMyGroups);   // my groups
router.get('/all',   getAllGroups);  // all groups (for discovery)
router.get('/:id',   getGroupById);
router.post('/',     createGroup);
router.post('/:id/join',  joinGroup);
router.delete('/:id/leave', leaveGroup);

module.exports = router;
