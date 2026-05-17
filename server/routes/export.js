'use strict';
const express   = require('express');
const ExcelJS   = require('exceljs');
const sheets    = require('../services/sheets');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// ─────────────────────────────────────────────────────────────
//  Diagnostic ping (no auth) — confirms router is reachable
// ─────────────────────────────────────────────────────────────
router.get('/ping', (req, res) => {
  console.log('[export] ping OK');
  res.json({ ok: true, ts: Date.now() });
});

// ─────────────────────────────────────────────────────────────
//  Timeout 包裝：超過 ms 就 reject
// ─────────────────────────────────────────────────────────────
function withTimeout(promise, ms, label) {
  const t = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`${label} 超時（${ms / 1000}秒）`)), ms)
  );
  return Promise.race([promise, t]);
}

// ─────────────────────────────────────────────────────────────
//  共用：取得批次 + 品項資料，組成匯出列
// ─────────────────────────────────────────────────────────────
async function getExportData(batchId) {
  console.log(`[export] getExportData start batchId=${batchId}`);
  const [batch, items] = await withTimeout(
    Promise.all([
      sheets.getBatchById(batchId),
      sheets.getBatchItems(batchId),
    ]),
    22000,
    'getExportData'
  );
  console.log(`[export] getExportData done batch=${!!batch} items=${items?.length}`);
  if (!batch) throw Object.assign(new Error('批次不存在'), { status: 404 });
  return { batch, items };
}

const HEADERS = [
  { header: '商品編號',   key: 'productId',   width: 14 },
  { header: '商品名稱',   key: 'productName', width: 20 },
  { header: '類別',       key: 'category',    width: 12 },
  { header: '單位',       key: 'unit',        width: 8  },
  { header: '帳面數量',   key: 'bookStock',   width: 10 },
  { header: '實盤數量',   key: 'actualStock', width: 10 },
  { header: '差異',       key: 'diff',        width: 8  },
  { header: '差異原因',   key: 'reason',      width: 16 },
  { header: '備注',       key: 'notes',       width: 16 },
  { header: '盤點人員',   key: 'counter',     width: 12 },
  { header: '盤點時間',   key: 'countedAt',   width: 18 },
  { header: '覆核人員',   key: 'reviewer',    width: 12 },
  { header: '覆核時間',   key: 'reviewedAt',  width: 18 },
];

// ─────────────────────────────────────────────────────────────
//  GET /api/export/:batchId/excel  →  下載 .xlsx
// ─────────────────────────────────────────────────────────────
router.get('/:batchId/excel', requireAuth, async (req, res) => {
  console.log(`[export] Excel request batchId=${req.params.batchId}`);
  try {
    const { batch, items } = await getExportData(req.params.batchId);

    const wb = new ExcelJS.Workbook();
    wb.creator = '野草倉庫盤點系統';
    wb.created = new Date();

    const ws = wb.addWorksheet('盤點結果');

    // 標題列（合併儲存格）
    ws.mergeCells('A1:M1');
    const titleCell = ws.getCell('A1');
    titleCell.value  = `野草倉庫盤點結果　批次：${batch.date}　狀態：${batch.status}`;
    titleCell.font   = { bold: true, size: 13 };
    titleCell.alignment = { horizontal: 'center' };
    ws.getRow(1).height = 24;

    ws.mergeCells('A2:M2');
    ws.getCell('A2').value = `建立人：${batch.createdBy}　備注：${batch.notes || '—'}`;
    ws.getCell('A2').font  = { size: 10, color: { argb: 'FF666666' } };
    ws.getRow(2).height = 18;

    // 表頭
    ws.addRow([]);          // 空行
    const headerRow = ws.addRow(HEADERS.map(h => h.header));
    headerRow.font      = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.alignment = { horizontal: 'center' };
    headerRow.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2D7D46' } };
      cell.border = {
        top: { style: 'thin' }, bottom: { style: 'thin' },
        left: { style: 'thin' }, right: { style: 'thin' },
      };
    });

    // 設定欄寬
    HEADERS.forEach((h, i) => { ws.getColumn(i + 1).width = h.width; });

    // 資料列
    items.forEach((item, idx) => {
      const row = ws.addRow([
        item.productId,
        item.productName,
        item.category,
        item.unit,
        item.bookStock,
        item.actualStock ?? '',
        item.diff ?? '',
        item.reason   || '',
        item.notes    || '',
        item.counter  || '',
        item.countedAt  ? item.countedAt.replace('T', ' ').slice(0, 16) : '',
        item.reviewer || '',
        item.reviewedAt ? item.reviewedAt.replace('T', ' ').slice(0, 16) : '',
      ]);

      // 差異欄著色（現在是第 7 欄，因多了商品編號欄）
      const diffCell = row.getCell(7);
      if (item.diff !== null && item.diff !== undefined) {
        if (item.diff < 0)      diffCell.font = { color: { argb: 'FFE53935' } };
        else if (item.diff > 0) diffCell.font = { color: { argb: 'FF1976D2' } };
      }

      // 交替底色
      if (idx % 2 === 0) {
        row.eachCell(cell => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5FAF6' } };
        });
      }
    });

    // 總計列
    const sumRow = ws.addRow([
      `共 ${items.length} 項`,
      '', '', '',
      items.reduce((s, i) => s + (i.bookStock || 0), 0),
      items.filter(i => i.actualStock !== null).reduce((s, i) => s + (i.actualStock || 0), 0),
      items.filter(i => i.diff !== null).reduce((s, i) => s + (i.diff || 0), 0),
    ]);
    sumRow.font = { bold: true };
    sumRow.getCell(1).alignment = { horizontal: 'left' };

    // 凍結表頭
    ws.views = [{ state: 'frozen', ySplit: 4 }];

    const filename = `野草盤點_${batch.date}_${batch.status}.xlsx`;
    console.log(`[export] writing Excel buffer, items=${items.length}`);
    const buffer = await wb.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
    res.setHeader('Content-Length', buffer.length);
    res.end(buffer);
    console.log(`[export] Excel done bytes=${buffer.length}`);
  } catch (e) {
    console.error('[export] Excel error:', e.message, e.stack);
    if (!res.headersSent) res.status(e.status || 500).json({ error: e.message });
  }
});

// ─────────────────────────────────────────────────────────────
//  POST /api/export/:batchId/gsheet  →  寫入 Google Sheets 新分頁
// ─────────────────────────────────────────────────────────────
router.post('/:batchId/gsheet', requireAuth, async (req, res) => {
  console.log(`[export] GSheet request batchId=${req.params.batchId}`);
  try {
    const { batch, items } = await getExportData(req.params.batchId);
    console.log(`[export] writing to GSheet tab...`);
    const result = await withTimeout(
      sheets.exportBatchToNewTab(batch, items),
      22000,
      'exportBatchToNewTab'
    );
    console.log(`[export] GSheet done:`, result.tabTitle);
    res.json(result);
  } catch (e) {
    console.error('[export] GSheet error:', e.message, e.stack);
    if (!res.headersSent) res.status(e.status || 500).json({ error: e.message });
  }
});

module.exports = router;
