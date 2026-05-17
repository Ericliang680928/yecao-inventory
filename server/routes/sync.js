'use strict';
const express = require('express');
const sheets  = require('../services/sheets');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// POST /api/sync
router.post('/', requireAdmin, async (req, res) => {
  try {
    const result = await sheets.syncProducts();
    res.json({ ok: true, ...result });
  } catch (e) {
    console.error('Sync error:', e);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
