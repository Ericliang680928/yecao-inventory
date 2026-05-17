'use strict';
const jwt = require('jsonwebtoken');

/**
 * 驗證 JWT token，將 user 掛到 req.user
 */
function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未登入，請先登入' });
  }
  try {
    req.user = jwt.verify(auth.slice(7), process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token 無效或已過期，請重新登入' });
  }
}

/**
 * 需要管理員角色
 */
function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: '需要管理員權限' });
    }
    next();
  });
}

/**
 * 需要覆核員或管理員
 */
function requireReviewer(req, res, next) {
  requireAuth(req, res, () => {
    if (!['admin', 'reviewer'].includes(req.user.role)) {
      return res.status(403).json({ error: '需要覆核員或管理員權限' });
    }
    next();
  });
}

module.exports = { requireAuth, requireAdmin, requireReviewer };
