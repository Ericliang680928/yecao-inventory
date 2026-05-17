'use strict';
const express = require('express');
const sheets  = require('../services/sheets');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/users — 管理員才能看全部使用者
router.get('/', requireAdmin, async (req, res) => {
  try {
    res.json(await sheets.getUsers());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/users — 建立使用者
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { username, name, role, password } = req.body;
    if (!username || !name || !password) return res.status(400).json({ error: '帳號、姓名、密碼為必填' });
    if (!['admin','counter','reviewer'].includes(role)) return res.status(400).json({ error: '角色錯誤' });
    const user = await sheets.createUser({ username, name, role, password });
    res.status(201).json(user);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/users/:username — 更新使用者
router.patch('/:username', requireAdmin, async (req, res) => {
  try {
    await sheets.updateUser(req.params.username, req.body);
    res.json({ ok: true });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

module.exports = router;
