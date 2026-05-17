'use strict';
const express = require('express');
const sheets  = require('../services/sheets');
const { requireAuth, requireReviewer, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/batches — 取得所有批次
router.get('/', requireAuth, async (req, res) => {
  try {
    res.json(await sheets.getBatches());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/batches/dashboard — 儀表板統計
router.get('/dashboard', requireAuth, async (req, res) => {
  try {
    res.json(await sheets.getDashboardStats());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/batches/:id — 取得單一批次
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const batch = await sheets.getBatchById(req.params.id);
    if (!batch) return res.status(404).json({ error: '批次不存在' });
    res.json(batch);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/batches — 建立批次
router.post('/', requireAuth, async (req, res) => {
  try {
    const { date, notes } = req.body;
    if (!date) return res.status(400).json({ error: '盤點日期為必填' });
    const batch = await sheets.createBatch({ date, createdBy: req.user.name || req.user.username, notes });
    res.status(201).json(batch);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/batches/:id/status — 更新批次狀態
router.patch('/:id/status', requireAuth, async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['進行中', '待覆核', '已結案'];
    if (!allowed.includes(status)) return res.status(400).json({ error: '狀態值錯誤' });

    const batch = await sheets.getBatchById(req.params.id);
    if (!batch) return res.status(404).json({ error: '批次不存在' });

    // 結案只有管理員/覆核員可操作
    if (status === '已結案' && !['admin','reviewer'].includes(req.user.role)) {
      return res.status(403).json({ error: '結案需要覆核員或管理員權限' });
    }
    // 已結案的批次不可再改狀態
    if (batch.status === '已結案') {
      return res.status(400).json({ error: '已結案的批次無法變更狀態' });
    }

    await sheets.updateBatchStatus(req.params.id, status);

    // 結案時將實盤數量同步回「庫存現況」工作表
    if (status === '已結案') {
      try {
        const syncResult = await sheets.writeStockToInventorySheet(req.params.id);
        return res.json({ ok: true, status, inventorySync: syncResult });
      } catch (syncErr) {
        console.error('庫存現況同步失敗（結案已完成）:', syncErr.message);
        return res.json({ ok: true, status, inventorySync: { error: syncErr.message } });
      }
    }

    res.json({ ok: true, status });
  } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

// GET /api/batches/:id/items — 取得批次明細
router.get('/:id/items', requireAuth, async (req, res) => {
  try {
    res.json(await sheets.getBatchItems(req.params.id));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/batches/:id/items/:productId — 更新單一盤點項目
router.put('/:id/items/:productId', requireAuth, async (req, res) => {
  try {
    const batch = await sheets.getBatchById(req.params.id);
    if (!batch) return res.status(404).json({ error: '批次不存在' });
    if (batch.status === '已結案') return res.status(400).json({ error: '已結案，無法編輯' });

    // 覆核欄位只有 reviewer/admin 能填
    if (req.body.reviewer !== undefined && !['admin','reviewer'].includes(req.user.role)) {
      return res.status(403).json({ error: '需要覆核員權限' });
    }

    const result = await sheets.updateBatchItem(
      req.params.id,
      req.params.productId,
      req.body,
      req.user.name || req.user.username
    );
    res.json(result);
  } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

module.exports = router;
