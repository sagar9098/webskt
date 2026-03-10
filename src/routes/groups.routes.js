// src/routes/groups.routes.js

const express = require('express');
const {
  getMyGroups, getAllGroups, getGroupById,
  createGroup, joinGroup, leaveGroup,
  addMember, removeMember,
} = require('../controllers/groups.controller');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

router.get('/',                             getMyGroups);
router.get('/all',                          getAllGroups);
router.get('/:id',                          getGroupById);
router.post('/',                            createGroup);
router.post('/:id/join',                    joinGroup);
router.post('/:id/add-member',              addMember);       // creator adds a user
router.delete('/:id/leave',                 leaveGroup);
router.delete('/:id/remove-member/:userId', removeMember);    // creator removes a user

module.exports = router;