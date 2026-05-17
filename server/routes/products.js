'use strict';
const express = require('express');
const sheets  = require('../services/sheets');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/products
router.get('/', requireAuth, async (req, res) => {
  try {
    const activeOnly = req.query.active === 'true';
    const products = await sheets.getProducts(activeOnly);
    res.json(products);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
