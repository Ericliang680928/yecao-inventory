'use strict';
/**
 * Google Sheets 服務層
 * 所有與 Google Sheets API 的互動都在此處處理
 */
const { google } = require('googleapis');
const bcrypt     = require('bcryptjs');
const fs         = require('fs');
const path       = require('path');

// ── 設定檔路徑（儲存自動建立的試算表 ID） ─────────────────────
const CONFIG_FILE = path.join(__dirname, '..', '.sheet_config.json');

// ── 工作表名稱 ─────────────────────────────────────────────────
const SH = {
  USERS:    '使用者',
  PRODUCTS: '產品主檔',
  BATCHES:  '盤點批次',
  ITEMS:    '盤點明細',
  INVENTORY:'庫存現況',
  SYNC_LOG: '同步日誌',
};

// ── 欄位索引（0-based，對應試算表欄）──────────────────────────
const COL = {
  USERS:    { username:0, password:1, name:2, role:3, active:4, createdAt:5, lastLogin:6 },
  PRODUCTS: { id:0, name:1, category:2, active:3, stock:4, sourceUpdated:5, syncedAt:6, unit:7 },
  BATCHES:  { id:0, date:1, createdBy:2, startTime:3, endTime:4, status:5, notes:6 },
  ITEMS:    {
    batchId:0, date:1, productId:2, productName:3, category:4,
    bookStock:5, actualStock:6, diff:7, reason:8, notes:9,
    counter:10, countedAt:11, reviewer:12, reviewedAt:13, version:14
  },
  INVENTORY:{ productId:0, productName:1, category:2, unit:3, stock:4, lastUpdated:5 },
  SYNC_LOG: { batchId:0, syncTime:1, added:2, updated:3, disabled:4, errors:5 },
};

// ── Lazy-init API clients ──────────────────────────────────────
let _sheets = null;
let _drive  = null;
let _inventorySheetId = null;

function getApis() {
  if (!_sheets) {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key:  (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
      },
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive',
      ],
    });
    _sheets = google.sheets({ version: 'v4', auth });
    _drive  = google.drive ({ version: 'v3', auth });
  }
  return { sheets: _sheets, drive: _drive };
}

function getSheetId() {
  if (_inventorySheetId) return _inventorySheetId;
  if (process.env.INVENTORY_SHEET_ID) {
    _inventorySheetId = process.env.INVENTORY_SHEET_ID;
    return _inventorySheetId;
  }
  if (fs.existsSync(CONFIG_FILE)) {
    const cfg = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    if (cfg.inventorySheetId) {
      _inventorySheetId = cfg.inventorySheetId;
      return _inventorySheetId;
    }
  }
  return null;
}

// ── 低階輔助函式 ───────────────────────────────────────────────
async function getRows(sheetName) {
  const { sheets } = getApis();
  const id = getSheetId();
  if (!id) throw new Error('INVENTORY_SHEET_ID 未設定');
  console.log(`[sheets] getRows start: ${sheetName}`);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: id,
    range: `${sheetName}!A2:Z`,
  }, { timeout: 20000 });
  console.log(`[sheets] getRows done: ${sheetName} rows=${res.data.values?.length || 0}`);
  return (res.data.values || []).map(row => {
    // 確保每列至少有 15 格（防止 undefined）
    while (row.length < 15) row.push('');
    return row;
  });
}

async function appendRow(sheetName, values) {
  const { sheets } = getApis();
  await sheets.spreadsheets.values.append({
    spreadsheetId: getSheetId(),
    range:         `${sheetName}!A:A`,
    valueInputOption: 'RAW',
    requestBody:   { values: [values] },
  }, { timeout: 15000 });
}

async function appendRows(sheetName, rowsArray) {
  if (!rowsArray.length) return;
  const { sheets } = getApis();
  await sheets.spreadsheets.values.append({
    spreadsheetId: getSheetId(),
    range:         `${sheetName}!A:A`,
    valueInputOption: 'RAW',
    requestBody:   { values: rowsArray },
  }, { timeout: 15000 });
}

async function updateRow(sheetName, rowIndex, values) {
  // rowIndex 是 0-based（來自 getRows），實際 Sheet 列 = rowIndex+2（標題列+1索引）
  const { sheets } = getApis();
  const sheetRow = rowIndex + 2;
  await sheets.spreadsheets.values.update({
    spreadsheetId: getSheetId(),
    range:         `${sheetName}!A${sheetRow}:Z${sheetRow}`,
    valueInputOption: 'RAW',
    requestBody:   { values: [values] },
  }, { timeout: 15000 });
}

async function batchUpdateRows(sheetName, updates) {
  // updates: Array<{ rowIndex: number, values: any[] }>
  if (!updates.length) return;
  const { sheets } = getApis();
  const data = updates.map(({ rowIndex, values }) => ({
    range:  `${sheetName}!A${rowIndex + 2}:Z${rowIndex + 2}`,
    values: [values],
  }));
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: getSheetId(),
    requestBody: { valueInputOption: 'RAW', data },
  }, { timeout: 15000 });
}

function now() { return new Date().toISOString(); }
function pad(row, len) { while (row.length < len) row.push(''); return row; }

// ═══════════════════════════════════════════════════════════════
//  初始化
// ═══════════════════════════════════════════════════════════════
async function initSheets() {
  console.log('🔧 初始化 Google Sheets 連線…');
  const { sheets, drive } = getApis();

  let sheetId = getSheetId();

  if (!sheetId) {
    // ── 建立新試算表 ──────────────────────────────────────────
    console.log('📊 建立專屬盤點試算表…');
    const res = await sheets.spreadsheets.create({
      requestBody: {
        properties: { title: '野草盤點系統' },
        sheets: Object.values(SH).map(title => ({ properties: { title } })),
      },
    });
    sheetId = res.data.spreadsheetId;
    _inventorySheetId = sheetId;

    // 寫入設定檔
    fs.writeFileSync(CONFIG_FILE, JSON.stringify({ inventorySheetId: sheetId }, null, 2));

    console.log('');
    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║  ✅  試算表建立完成！                             ║');
    console.log(`║  ID: ${sheetId}  ║`);
    console.log(`║  🔗 https://docs.google.com/spreadsheets/d/${sheetId.substring(0,8)}…`);
    console.log('║  ⚠️  請把此 ID 填入 server/.env INVENTORY_SHEET_ID ║');
    console.log('╚══════════════════════════════════════════════════╝');
    console.log('');

    // 自動共用給 OWNER_EMAIL
    if (process.env.OWNER_EMAIL) {
      try {
        await drive.permissions.create({
          fileId: sheetId,
          sendNotificationEmail: false,
          requestBody: { type: 'user', role: 'writer', emailAddress: process.env.OWNER_EMAIL },
        });
        console.log(`✉️  已自動共用給 ${process.env.OWNER_EMAIL}`);
      } catch (e) {
        console.warn(`⚠️  自動共用失敗（可手動開啟連結共用）: ${e.message}`);
      }
    }

    await setupHeaders(sheetId);
    await createDefaultAdmin();

  } else {
    console.log(`✅ 使用現有試算表: ${sheetId}`);
    await ensureSheetsExist(sheetId);
    // 若使用者表為空，建立預設管理員
    const existingUsers = await getRows(SH.USERS);
    if (existingUsers.filter(r => r[0]).length === 0) {
      await createDefaultAdmin();
    }
  }

  console.log('🎉 Google Sheets 初始化完成\n');
}

async function setupHeaders(sheetId) {
  const { sheets } = getApis();
  const data = [
    { sheet: SH.USERS,    hdr: ['帳號','密碼','姓名','角色','啟用','建立時間','最後登入'] },
    { sheet: SH.PRODUCTS, hdr: ['商品編號','商品名稱','類別','啟用狀態','帳面庫存','來源更新時間','同步時間','單位'] },
    { sheet: SH.BATCHES,  hdr: ['批次ID','盤點日期','建立人','開始時間','完成時間','狀態','備註'] },
    { sheet: SH.ITEMS,    hdr: ['批次ID','盤點日期','商品編號','商品名稱快照','類別快照','帳面庫存快照','實盤庫存','差異數量','差異原因','備註','盤點人員','盤點時間','覆核人員','覆核時間','版本時間戳'] },
    { sheet: SH.INVENTORY,hdr: ['商品編號','商品名稱','類別','單位','帳面庫存','最後更新時間'] },
    { sheet: SH.SYNC_LOG, hdr: ['同步批次ID','同步時間','新增筆數','更新筆數','停用筆數','錯誤訊息'] },
  ].map(({ sheet, hdr }) => ({ range: `${sheet}!A1:Z1`, values: [hdr] }));

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: sheetId,
    requestBody: { valueInputOption: 'RAW', data },
  });
}

async function ensureSheetsExist(sheetId) {
  const { sheets } = getApis();
  const res = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
  const existing = res.data.sheets.map(s => s.properties.title);
  const missing  = Object.values(SH).filter(n => !existing.includes(n));
  if (missing.length === 0) return;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: sheetId,
    requestBody: { requests: missing.map(title => ({ addSheet: { properties: { title } } })) },
  });
  await setupHeaders(sheetId);
}

async function createDefaultAdmin() {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'Admin@1234';
  const hash = await bcrypt.hash(password, 10);
  await appendRow(SH.USERS, [username, hash, '系統管理員', 'admin', 'Y', now(), '']);
  console.log(`👤 預設管理員：${username} / ${password}`);
}

// ═══════════════════════════════════════════════════════════════
//  使用者
// ═══════════════════════════════════════════════════════════════
async function getUsers() {
  const rows = await getRows(SH.USERS);
  return rows
    .filter(r => r[COL.USERS.username])
    .map(r => ({
      username: r[COL.USERS.username],
      name:     r[COL.USERS.name],
      role:     r[COL.USERS.role] || 'counter',
      active:   r[COL.USERS.active] === 'Y',
      createdAt:r[COL.USERS.createdAt],
      lastLogin:r[COL.USERS.lastLogin],
    }));
}

async function getUserByUsername(username) {
  const rows = await getRows(SH.USERS);
  const idx  = rows.findIndex(r => r[COL.USERS.username] === username);
  if (idx === -1) return null;
  const r = rows[idx];
  return {
    username: r[COL.USERS.username],
    password: r[COL.USERS.password],
    name:     r[COL.USERS.name],
    role:     r[COL.USERS.role] || 'counter',
    active:   r[COL.USERS.active] === 'Y',
    _rowIndex: idx,
  };
}

async function updateUserLastLogin(username) {
  const rows = await getRows(SH.USERS);
  const idx  = rows.findIndex(r => r[COL.USERS.username] === username);
  if (idx === -1) return;
  const row = pad([...rows[idx]], 7);
  row[COL.USERS.lastLogin] = now();
  await updateRow(SH.USERS, idx, row);
}

async function createUser({ username, name, role, password }) {
  const hash = await bcrypt.hash(password, 10);
  const t = now();
  await appendRow(SH.USERS, [username, hash, name, role, 'Y', t, '']);
  return { username, name, role, active: true, createdAt: t };
}

async function updateUser(username, updates) {
  const rows = await getRows(SH.USERS);
  const idx  = rows.findIndex(r => r[COL.USERS.username] === username);
  if (idx === -1) throw Object.assign(new Error('使用者不存在'), { status: 404 });
  const row = pad([...rows[idx]], 7);
  if (updates.name   !== undefined) row[COL.USERS.name]   = updates.name;
  if (updates.role   !== undefined) row[COL.USERS.role]   = updates.role;
  if (updates.active !== undefined) row[COL.USERS.active] = updates.active ? 'Y' : 'N';
  if (updates.password)             row[COL.USERS.password] = await bcrypt.hash(updates.password, 10);
  await updateRow(SH.USERS, idx, row);
}

// ═══════════════════════════════════════════════════════════════
//  產品
// ═══════════════════════════════════════════════════════════════
async function getProducts(activeOnly = false) {
  const rows = await getRows(SH.PRODUCTS);
  const c = COL.PRODUCTS;
  const list = rows
    .filter(r => r[c.id])
    .map((r, idx) => ({
      id:            r[c.id],
      name:          r[c.name],
      category:      r[c.category],
      active:        r[c.active] !== 'N',
      stock:         parseFloat(r[c.stock]) || 0,
      unit:          r[c.unit] || '',
      sourceUpdated: r[c.sourceUpdated],
      syncedAt:      r[c.syncedAt],
      _rowIndex:     idx,
    }));
  return activeOnly ? list.filter(p => p.active) : list;
}

// ═══════════════════════════════════════════════════════════════
//  同步產品（來源 → 盤點試算表）
// ═══════════════════════════════════════════════════════════════
async function syncProducts() {
  const { sheets } = getApis();
  const t   = now();
  const syncId = `SYNC-${Date.now()}`;
  let errors = '';

  // 1. 讀來源
  let sourceRows = [];
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SOURCE_SHEET_ID,
      range:         `${process.env.SOURCE_SHEET_NAME}!A2:D`,
    });
    sourceRows = res.data.values || [];
  } catch (e) {
    errors = `讀取來源失敗: ${e.message}`;
  }

  // 來源欄位：A=商品編號, B=商品名稱, C=類別, D=單位
  const sourceProducts = sourceRows
    .map(r => ({
      id:       String(r[0]||'').trim(),
      name:     String(r[1]||'').trim(),
      category: String(r[2]||'').trim(),
      unit:     String(r[3]||'').trim(),
    }))
    .filter(p => p.id && p.name);

  // 2. 讀現有產品主檔
  const currentRows = await getRows(SH.PRODUCTS);
  const c = COL.PRODUCTS;
  const currentMap = {};
  currentRows.filter(r => r[c.id]).forEach((r, idx) => { currentMap[r[c.id]] = { r, idx }; });

  // 3. Upsert
  let added = 0, updated = 0, disabled = 0;
  const batchUp = [];
  const newRows  = [];
  const sourceIds = new Set(sourceProducts.map(p => p.id));

  for (const sp of sourceProducts) {
    if (currentMap[sp.id]) {
      const { r, idx } = currentMap[sp.id];
      const changed = r[c.name] !== sp.name || r[c.category] !== sp.category || (r[c.unit]||'') !== sp.unit;
      if (changed) {
        const row = pad([...r], 8);
        row[c.name]          = sp.name;
        row[c.category]      = sp.category;
        row[c.unit]          = sp.unit;
        row[c.sourceUpdated] = t;
        row[c.syncedAt]      = t;
        batchUp.push({ rowIndex: idx, values: row });
        updated++;
      }
    } else {
      newRows.push([sp.id, sp.name, sp.category, 'Y', '0', t, t, sp.unit]);
      added++;
    }
  }

  // 停用已從來源移除的產品
  for (const [id, { r, idx }] of Object.entries(currentMap)) {
    if (!sourceIds.has(id) && r[c.active] !== 'N') {
      const row = pad([...r], 7);
      row[c.active]   = 'N';
      row[c.syncedAt] = t;
      batchUp.push({ rowIndex: idx, values: row });
      disabled++;
    }
  }

  await batchUpdateRows(SH.PRODUCTS, batchUp);
  await appendRows(SH.PRODUCTS, newRows);

  // 新增產品也要加入庫存現況（nr = [id, name, category, 'Y', '0', t, t, unit]）
  for (const nr of newRows) {
    await upsertInventory(nr[0], nr[1], nr[2], nr[7], 0);
  }

  // 4. 同步日誌
  await appendRow(SH.SYNC_LOG, [syncId, t, added, updated, disabled, errors]);

  return { added, updated, disabled, errors, syncId };
}

async function upsertInventory(productId, productName, category, unit, stock) {
  const rows = await getRows(SH.INVENTORY);
  const c = COL.INVENTORY;
  const idx = rows.findIndex(r => r[c.productId] === productId);
  const t = now();
  if (idx === -1) {
    await appendRow(SH.INVENTORY, [productId, productName || '', category || '', unit || '', stock, t]);
  }
}

// ═══════════════════════════════════════════════════════════════
//  盤點批次
// ═══════════════════════════════════════════════════════════════
async function getBatches() {
  const rows = await getRows(SH.BATCHES);
  const c = COL.BATCHES;
  return rows
    .filter(r => r[c.id])
    .map((r, idx) => ({
      id:        r[c.id],
      date:      r[c.date],
      createdBy: r[c.createdBy],
      startTime: r[c.startTime],
      endTime:   r[c.endTime],
      status:    r[c.status] || '進行中',
      notes:     r[c.notes],
      _rowIndex: idx,
    }))
    .sort((a, b) => b.startTime.localeCompare(a.startTime));
}

async function getBatchById(batchId) {
  const batches = await getBatches();
  return batches.find(b => b.id === batchId) || null;
}

async function createBatch({ date, createdBy, notes }) {
  const id = `B-${Date.now()}`;
  const t  = now();
  await appendRow(SH.BATCHES, [id, date, createdBy, t, '', '進行中', notes || '']);

  // 預填所有啟用產品
  const products = await getProducts(true);
  const itemRows = products.map(p => [
    id, date, p.id, p.name, p.category,
    p.stock, '', '', '', '', '', '', '', '', t,
  ]);
  await appendRows(SH.ITEMS, itemRows);

  return { id, date, createdBy, startTime: t, status: '進行中', notes };
}

async function updateBatchStatus(batchId, status) {
  const rows = await getRows(SH.BATCHES);
  const c = COL.BATCHES;
  const idx = rows.findIndex(r => r[c.id] === batchId);
  if (idx === -1) throw Object.assign(new Error('批次不存在'), { status: 404 });

  const row = pad([...rows[idx]], 7);
  row[c.status]  = status;
  if (status === '已結案') row[c.endTime] = now();
  await updateRow(SH.BATCHES, idx, row);
}

// ═══════════════════════════════════════════════════════════════
//  盤點明細
// ═══════════════════════════════════════════════════════════════
async function getBatchItems(batchId) {
  const [rows, products] = await Promise.all([
    getRows(SH.ITEMS),
    getProducts(),
  ]);
  const c = COL.ITEMS;
  // Build unit lookup from products
  const unitMap = {};
  products.forEach(p => { unitMap[p.id] = p.unit || ''; });

  return rows
    .filter(r => r[c.batchId] === batchId)
    .map((r, _idx) => {
      const actual = r[c.actualStock] !== '' ? parseFloat(r[c.actualStock]) : null;
      const book   = parseFloat(r[c.bookStock]) || 0;
      return {
        batchId:     r[c.batchId],
        date:        r[c.date],
        productId:   r[c.productId],
        productName: r[c.productName],
        category:    r[c.category],
        unit:        unitMap[r[c.productId]] || '',
        bookStock:   book,
        actualStock: actual,
        diff:        actual !== null ? actual - book : null,
        reason:      r[c.reason],
        notes:       r[c.notes],
        counter:     r[c.counter],
        countedAt:   r[c.countedAt],
        reviewer:    r[c.reviewer],
        reviewedAt:  r[c.reviewedAt],
        version:     r[c.version],
      };
    });
}

async function updateBatchItem(batchId, productId, data, username) {
  const rows = await getRows(SH.ITEMS);
  const c = COL.ITEMS;
  const idx = rows.findIndex(r => r[c.batchId] === batchId && r[c.productId] === productId);
  if (idx === -1) throw Object.assign(new Error('盤點項目不存在'), { status: 404 });

  // 樂觀鎖定
  const existingVersion = rows[idx][c.version];
  if (data.version && data.version !== existingVersion) {
    throw Object.assign(new Error('資料已被他人修改，請重新載入最新版本'), { status: 409 });
  }

  const row = pad([...rows[idx]], 15);
  const t   = now();

  if (data.actualStock !== undefined && data.actualStock !== '') {
    row[c.actualStock] = data.actualStock;
    row[c.diff]        = parseFloat(data.actualStock) - (parseFloat(row[c.bookStock]) || 0);
    row[c.counter]     = username;
    row[c.countedAt]   = t;
  }
  if (data.reason   !== undefined) row[c.reason]    = data.reason;
  if (data.notes    !== undefined) row[c.notes]     = data.notes;
  if (data.reviewer !== undefined) {
    row[c.reviewer]   = data.reviewer;
    row[c.reviewedAt] = t;
  }
  row[c.version] = t;

  await updateRow(SH.ITEMS, idx, row);

  return {
    productId,
    actualStock: row[c.actualStock],
    diff:        row[c.diff],
    reason:      row[c.reason],
    notes:       row[c.notes],
    counter:     row[c.counter],
    countedAt:   row[c.countedAt],
    reviewer:    row[c.reviewer],
    reviewedAt:  row[c.reviewedAt],
    version:     t,
  };
}

// ═══════════════════════════════════════════════════════════════
//  結案時將實盤數量同步回「庫存現況」工作表
// ═══════════════════════════════════════════════════════════════
async function writeStockToInventorySheet(batchId) {
  const items    = await getBatchItems(batchId);
  const products = await getProducts();
  const productMap = {};
  products.forEach(p => { productMap[p.id] = p; });

  const t = now();
  const existingRows = await getRows(SH.INVENTORY);
  const c = COL.INVENTORY;

  // Build index of existing rows
  const existingMap = {};
  existingRows.forEach((r, idx) => {
    if (r[c.productId]) existingMap[r[c.productId]] = idx;
  });

  const batchUpdates = [];
  const newRows      = [];

  for (const item of items) {
    if (item.actualStock === null) continue; // 未盤點的跳過
    const product = productMap[item.productId] || {};
    const rowData = [
      item.productId,
      item.productName,
      item.category,
      product.unit || '',
      item.actualStock,
      t,
    ];
    if (existingMap[item.productId] !== undefined) {
      batchUpdates.push({ rowIndex: existingMap[item.productId], values: rowData });
    } else {
      newRows.push(rowData);
    }
  }

  await batchUpdateRows(SH.INVENTORY, batchUpdates);
  await appendRows(SH.INVENTORY, newRows);

  console.log(`✅ 庫存現況同步完成：更新 ${batchUpdates.length} 筆，新增 ${newRows.length} 筆`);
  return { updated: batchUpdates.length, added: newRows.length };
}

// ═══════════════════════════════════════════════════════════════
//  儀表板統計
// ═══════════════════════════════════════════════════════════════
async function getDashboardStats() {
  const batches = await getBatches();
  const today   = new Date().toISOString().split('T')[0];

  // 今日批次 or 最新進行中批次
  const active = batches.find(b => b.date === today && b.status === '進行中')
               || batches.find(b => b.status === '進行中');

  if (!active) {
    return { batch: null, total: 0, counted: 0, withDiff: 0, pending: 0 };
  }

  const items   = await getBatchItems(active.id);
  const total   = items.length;
  const counted = items.filter(i => i.actualStock !== null).length;
  const withDiff= items.filter(i => i.diff !== null && i.diff !== 0).length;
  const pending = total - counted;

  return { batch: active, total, counted, withDiff, pending };
}

// ═══════════════════════════════════════════════════════════════
//  歷史查詢
// ═══════════════════════════════════════════════════════════════
async function getHistory(batchId) {
  return getBatchItems(batchId);
}

// ═══════════════════════════════════════════════════════════════
//  匯出批次結果到 Google Sheets 新分頁
// ═══════════════════════════════════════════════════════════════
async function exportBatchToNewTab(batch, items) {
  const { sheets: sheetsApi } = getApis();
  const spreadsheetId = getSheetId();

  // 分頁標題（用批次日期 + 最後 4 碼 ID 避免重複）
  const tabTitle = `盤點_${batch.date}_${batch.id.slice(-4)}`;

  // 取得現有分頁清單
  const meta = await sheetsApi.spreadsheets.get({ spreadsheetId }, { timeout: 15000 });
  const existing = meta.data.sheets.map(s => s.properties.title);

  let sheetGid;
  if (existing.includes(tabTitle)) {
    sheetGid = meta.data.sheets.find(s => s.properties.title === tabTitle).properties.sheetId;
    await sheetsApi.spreadsheets.values.clear({ spreadsheetId, range: `${tabTitle}!A:Z` }, { timeout: 15000 });
  } else {
    const addRes = await sheetsApi.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: [{ addSheet: { properties: { title: tabTitle } } }] },
    }, { timeout: 15000 });
    sheetGid = addRes.data.replies[0].addSheet.properties.sheetId;
  }

  const headerRow = ['商品編號','商品名稱','類別','單位','帳面數量','實盤數量','差異','差異原因','備注','盤點人員','盤點時間','覆核人員','覆核時間'];
  const titleRow  = [`野草盤點結果　批次：${batch.date}　狀態：${batch.status}　建立人：${batch.createdBy}`];
  const dataRows  = items.map(i => [
    i.productId, i.productName, i.category, i.unit,
    i.bookStock, i.actualStock ?? '', i.diff ?? '',
    i.reason || '', i.notes || '', i.counter || '',
    i.countedAt  ? i.countedAt.replace('T',' ').slice(0,16)  : '',
    i.reviewer || '',
    i.reviewedAt ? i.reviewedAt.replace('T',' ').slice(0,16) : '',
  ]);

  await sheetsApi.spreadsheets.values.update({
    spreadsheetId,
    range: `${tabTitle}!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [titleRow, [], headerRow, ...dataRows] },
  }, { timeout: 20000 });

  // 格式化
  await sheetsApi.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        { repeatCell: {
            range: { sheetId: sheetGid, startRowIndex: 0, endRowIndex: 1 },
            cell: { userEnteredFormat: { textFormat: { bold: true, fontSize: 12 } } },
            fields: 'userEnteredFormat.textFormat',
        }},
        { repeatCell: {
            range: { sheetId: sheetGid, startRowIndex: 2, endRowIndex: 3 },
            cell: { userEnteredFormat: {
              backgroundColor: { red: 0.176, green: 0.49, blue: 0.275 },
              textFormat: { bold: true, foregroundColor: { red:1, green:1, blue:1 } },
              horizontalAlignment: 'CENTER',
            }},
            fields: 'userEnteredFormat',
        }},
        { updateSheetProperties: {
            properties: { sheetId: sheetGid, gridProperties: { frozenRowCount: 3 } },
            fields: 'gridProperties.frozenRowCount',
        }},
      ],
    },
  }, { timeout: 15000 });

  return {
    ok: true,
    tabTitle,
    spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=${sheetGid}`,
    rowCount: dataRows.length,
  };
}


module.exports = {
  initSheets,
  // 使用者
  getUsers, getUserByUsername, updateUserLastLogin, createUser, updateUser,
  // 產品
  getProducts,
  // 同步
  syncProducts,
  // 批次
  getBatches, getBatchById, createBatch, updateBatchStatus,
  // 明細
  getBatchItems, updateBatchItem,
  // 結案同步
  writeStockToInventorySheet,
  // 匯出
  exportBatchToNewTab,
  // 儀表板
  getDashboardStats,
  // 歷史
  getHistory,
};
