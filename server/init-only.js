'use strict';
/**
 * 初始化腳本：只建立 Google Sheet 後退出
 * 用法：node init-only.js
 */
require('dotenv').config();
const sheets = require('./services/sheets');
const fs     = require('fs');
const path   = require('path');

sheets.initSheets()
  .then(() => {
    // 讀取 config 確認 ID
    const cfg = JSON.parse(
      fs.readFileSync(path.join(__dirname, '.sheet_config.json'), 'utf8')
    );
    console.log('\n=== 初始化完成 ===');
    console.log('INVENTORY_SHEET_ID=' + cfg.inventorySheetId);
    console.log('請把上面的 ID 填入 server/.env 的 INVENTORY_SHEET_ID=');
    console.log('===============================\n');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ 初始化失敗:', err.message);
    process.exit(1);
  });
