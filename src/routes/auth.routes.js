// src/routes/auth.routes.js

const express = require('express');
const { login } = require('../controllers/auth.controller');

const router = express.Router();

// POST /auth/login  — anonymous login / auto-register
router.post('/login', login);

module.exports = router;
