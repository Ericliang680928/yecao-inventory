'use strict';
const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const sheets  = require('../services/sheets');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: '請輸入帳號和密碼' });

    const user = await sheets.getUserByUsername(username.trim());
    if (!user)         return res.status(401).json({ error: '帳號不存在' });
    if (!user.active)  return res.status(401).json({ error: '帳號已停用，請聯絡管理員' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: '密碼錯誤' });

    const token = jwt.sign(
      { username: user.username, name: user.name, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    sheets.updateUserLastLogin(username).catch(() => {}); // 非同步，不阻塞回應

    res.json({
      token,
      user: { username: user.username, name: user.name, role: user.role },
    });
  } catch (e) {
    console.error('Login error:', e);
    res.status(500).json({ error: '登入失敗：' + e.message });
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  res.json(req.user);
});

module.exports = router;
