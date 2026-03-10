// src/routes/giphy.routes.js

const express = require('express');
const { searchGifs, trendingGifs } = require('../controllers/giphy.controller');
const auth = require('../middleware/auth');

const router = express.Router();

router.use(auth); // JWT required — users must be logged in to fetch GIFs

router.get('/search',   searchGifs);   // GET /giphy/search?q=cats
router.get('/trending', trendingGifs); // GET /giphy/trending

module.exports = router;
