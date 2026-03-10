// src/controllers/giphy.controller.js
// Proxies Giphy API requests — keeps the API key server-side only

const https = require('https');

const GIPHY_API_KEY = process.env.GIPHY_API_KEY;
const GIPHY_BASE    = 'https://api.giphy.com/v1/gifs';
const DEFAULT_LIMIT = 24;
const MAX_LIMIT     = 48;

// ─── Helper: fetch from Giphy ─────────────────────────────────────────────────

function giphyFetch(path) {
  return new Promise((resolve, reject) => {
    https.get(path, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

// ─── GET /giphy/search?q=cats&limit=24&offset=0 ───────────────────────────────

async function searchGifs(req, res) {
  try {
    if (!GIPHY_API_KEY) {
      return res.status(503).json({ message: 'Giphy not configured on server.' });
    }

    const q      = (req.query.q || '').trim();
    const limit  = Math.min(parseInt(req.query.limit  || DEFAULT_LIMIT), MAX_LIMIT);
    const offset = parseInt(req.query.offset || '0');

    if (!q) return res.json({ data: [] });

    const url = `${GIPHY_BASE}/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(q)}&limit=${limit}&offset=${offset}&rating=pg-13&lang=en`;
    const result = await giphyFetch(url);

    // Only return what Flutter needs — strip unnecessary fields
    const gifs = (result.data || []).map(gif => ({
      id:    gif.id,
      title: gif.title,
      url:   gif.images?.original?.url,
      preview: {
        url:    gif.images?.fixed_height?.url,
        width:  gif.images?.fixed_height?.width,
        height: gif.images?.fixed_height?.height,
      },
    }));

    return res.json({ data: gifs, pagination: result.pagination });
  } catch (err) {
    console.error('[Giphy] search error:', err);
    return res.status(500).json({ message: 'Failed to fetch GIFs.' });
  }
}

// ─── GET /giphy/trending?limit=24 ────────────────────────────────────────────

async function trendingGifs(req, res) {
  try {
    if (!GIPHY_API_KEY) {
      return res.status(503).json({ message: 'Giphy not configured on server.' });
    }

    const limit  = Math.min(parseInt(req.query.limit || DEFAULT_LIMIT), MAX_LIMIT);
    const offset = parseInt(req.query.offset || '0');

    const url = `${GIPHY_BASE}/trending?api_key=${GIPHY_API_KEY}&limit=${limit}&offset=${offset}&rating=pg-13`;
    const result = await giphyFetch(url);

    const gifs = (result.data || []).map(gif => ({
      id:    gif.id,
      title: gif.title,
      url:   gif.images?.original?.url,
      preview: {
        url:    gif.images?.fixed_height?.url,
        width:  gif.images?.fixed_height?.width,
        height: gif.images?.fixed_height?.height,
      },
    }));

    return res.json({ data: gifs, pagination: result.pagination });
  } catch (err) {
    console.error('[Giphy] trending error:', err);
    return res.status(500).json({ message: 'Failed to fetch trending GIFs.' });
  }
}

module.exports = { searchGifs, trendingGifs };